"""Feed API router - main API for frontend."""
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Event, Tag, Source, EventRelationship, EventTag
from app.schemas import (
    EventResponse, EventListResponse, 
    HeatmapData, RadarSignal, StatsResponse,
    TagResponse
)

router = APIRouter(prefix="/feed", tags=["feed"])


# ============ SCHEMAS FOR GRAPH ============
class GraphNode(BaseModel):
    """Graph node for event."""
    id: str
    title: str
    url: str
    category: Optional[str] = None
    importance_score: float
    published_at: str
    source_name: Optional[str] = None


class GraphEdge(BaseModel):
    """Graph edge for event relationships."""
    source: str
    target: str
    relationship_type: str
    weight: float = 1.0


class GraphData(BaseModel):
    """Graph data response."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class RelatedEvent(BaseModel):
    """Related event response."""
    id: str
    title: str
    category: Optional[str] = None
    importance_score: float
    relationship_type: str
    weight: float


# ============ EXISTING ENDPOINTS ============

@router.get("", response_model=EventListResponse)
async def get_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    tag_slug: Optional[str] = None,
    source_id: Optional[UUID] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    sort_by: str = Query("published_at", pattern="^(published_at|importance_score)$"),
    db: AsyncSession = Depends(get_db)
):
    """Get the main feed of AI events with filtering."""
    from app.models import EventTag
    
    # Build base query with relationships
    query = select(Event).options(
        selectinload(Event.source),
        selectinload(Event.tags)
    )
    
    # Apply filters
    conditions = []
    if category:
        conditions.append(Event.category == category)
    if source_id:
        conditions.append(Event.source_id == source_id)
    if min_score is not None:
        conditions.append(Event.importance_score >= min_score)
    if max_score is not None:
        conditions.append(Event.importance_score <= max_score)
    if search:
        conditions.append(
            Event.title.ilike(f"%{search}%") | 
            Event.summary.ilike(f"%{search}%")
        )
    if start_date:
        conditions.append(Event.published_at >= start_date)
    if end_date:
        conditions.append(Event.published_at <= end_date)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Handle tag filter with join
    if tag_slug:
        query = query.join(Event.tags).where(Tag.slug == tag_slug)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply sorting
    if sort_by == "importance_score":
        query = query.order_by(Event.importance_score.desc())
    else:
        query = query.order_by(Event.published_at.desc())
    
    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    events = result.scalars().all()
    
    return EventListResponse(
        events=[EventResponse.model_validate(e) for e in events],
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total
    )


@router.get("/timeline", response_model=EventListResponse)
async def get_timeline(
    days: int = Query(7, ge=1, le=90),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get events for timeline view (last N days)."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = select(Event).options(
        selectinload(Event.source),
        selectinload(Event.tags)
    ).where(Event.published_at >= start_date).order_by(Event.published_at.desc())
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    events = result.scalars().all()
    
    return EventListResponse(
        events=[EventResponse.model_validate(e) for e in events],
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total
    )


@router.get("/radar", response_model=List[RadarSignal])
async def get_radar_signals(
    limit: int = Query(20, ge=1, le=100),
    days: int = Query(1, ge=1, le=90),
    db: AsyncSession = Depends(get_db)
):
    """Get live radar signals - most recent events from last N days."""
    # Get most recent events from last N days
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = (
        select(Event)
        .options(selectinload(Event.source))
        .where(Event.published_at >= start_date)
        .order_by(Event.published_at.desc())
        .limit(limit)
    )
    
    result = await db.execute(query)
    events = result.scalars().all()
    
    signals = []
    for event in events:
        signals.append(RadarSignal(
            id=event.id,
            title=event.title,
            category=event.category or "uncategorized",
            importance_score=event.importance_score,
            published_at=event.published_at,
            source_name=event.source.name if event.source else "Unknown"
        ))
    
    return signals


@router.get("/heatmap", response_model=List[HeatmapData])
async def get_heatmap(
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db)
):
    """Get heatmap data for impact intensity over time."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Group by date and get count + avg score
    query = (
        select(
            func.date(Event.published_at).label('date'),
            func.count(Event.id).label('count'),
            func.avg(Event.importance_score).label('avg_score')
        )
        .where(Event.published_at >= start_date)
        .group_by(func.date(Event.published_at))
        .order_by(func.date(Event.published_at))
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    heatmap_data = []
    for row in rows:
        heatmap_data.append(HeatmapData(
            date=str(row.date),
            count=row.count,
            avg_score=float(row.avg_score) if row.avg_score else 0.0
        ))
    
    return heatmap_data


@router.get("/trending", response_model=List[TagResponse])
async def get_trending_tags(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get trending tags based on recent event usage."""
    # Get tags with most events in last 7 days
    start_date = datetime.utcnow() - timedelta(days=7)
    
    query = (
        select(Tag, func.count(Event.id).label('event_count'))
        .join(EventTag)
        .join(Event)
        .where(Event.published_at >= start_date)
        .group_by(Tag.id)
        .order_by(func.count(Event.id).desc())
        .limit(limit)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    # Return tags sorted by popularity
    tags = [row[0] for row in rows]
    return tags


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    start_date: Optional[datetime] = Query(None, description="Start date for stats filtering (ISO 8601 format)"),
    end_date: Optional[datetime] = Query(None, description="End date for stats filtering (ISO 8601 format)"),
    db: AsyncSession = Depends(get_db)
):
    """Get overall statistics with optional date filtering."""
    # Total counts (no date filter)
    total_events_all_time = await db.scalar(select(func.count(Event.id)))
    total_sources = await db.scalar(select(func.count(Source.id)))
    total_tags = await db.scalar(select(func.count(Tag.id)))
    
    # Default: today if no date range provided
    default_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Use provided dates or default to last 30 days
    filter_start = start_date if start_date else default_start
    filter_end = end_date if end_date else datetime.utcnow()
    
    # Events in the filtered date range
    total_events_filtered = await db.scalar(
        select(func.count(Event.id)).where(
            and_(
                Event.published_at >= filter_start,
                Event.published_at <= filter_end
            )
        )
    )
    
    # Events today (midnight to now in UTC)
    today_start_utc = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    events_today = await db.scalar(
        select(func.count(Event.id)).where(Event.published_at >= today_start_utc)
    )
    
    # Average importance score (in date range)
    avg_score = await db.scalar(
        select(func.avg(Event.importance_score)).where(
            and_(
                Event.published_at >= filter_start,
                Event.published_at <= filter_end
            )
        )
    )
    
    # Category breakdown (in date range)
    category_query = (
        select(Event.category, func.count(Event.id))
        .where(Event.category.isnot(None))
        .where(
            and_(
                Event.published_at >= filter_start,
                Event.published_at <= filter_end
            )
        )
        .group_by(Event.category)
    )
    category_result = await db.execute(category_query)
    category_breakdown = {row[0]: row[1] for row in category_result.all()}
    
    # Top tags (in date range)
    top_tags_query = (
        select(Tag.name, Tag.slug, func.count(Event.id).label('count'))
        .select_from(Tag)
        .join(EventTag, EventTag.tag_id == Tag.id)
        .join(Event, Event.id == EventTag.event_id)
        .where(
            and_(
                Event.published_at >= filter_start,
                Event.published_at <= filter_end
            )
        )
        .group_by(Tag.id, Tag.name, Tag.slug)
        .order_by(func.count(Event.id).desc())
        .limit(20)
    )
    top_tags_result = await db.execute(top_tags_query)
    top_tags = [
        {"name": row[0], "slug": row[1], "count": row[2]} 
        for row in top_tags_result.all()
    ]
    
    return StatsResponse(
        total_events=total_events_filtered or 0,
        total_sources=total_sources or 0,
        total_tags=total_tags or 0,
        events_today=events_today or 0,
        avg_importance_score=float(avg_score) if avg_score else 0.0,
        category_breakdown=category_breakdown,
        top_tags=top_tags
    )


@router.get("/latest", response_model=List[EventResponse])
async def get_latest(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get the latest events."""
    query = (
        select(Event)
        .options(selectinload(Event.source), selectinload(Event.tags))
        .order_by(Event.published_at.desc())
        .limit(limit)
    )
    
    result = await db.execute(query)
    events = result.scalars().all()
    
    return [EventResponse.model_validate(e) for e in events]


@router.get("/top", response_model=List[EventResponse])
async def get_top_events(
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get top events by importance score in the last N days."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = (
        select(Event)
        .options(selectinload(Event.source), selectinload(Event.tags))
        .where(Event.published_at >= start_date)
        .order_by(Event.importance_score.desc())
        .limit(limit)
    )
    
    result = await db.execute(query)
    events = result.scalars().all()
    
    return [EventResponse.model_validate(e) for e in events]


# ============ NEW PHASE 3 ENDPOINTS ============

@router.get("/graph", response_model=GraphData)
async def get_graph(
    days: int = Query(30, ge=7, le=90),
    limit: int = Query(1000, ge=10, le=5000),
    min_score: float = Query(0, ge=0, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get event relationship graph data for visualization."""
    from app.models import EventTag
    
    # Get events within date range with min score
    start_date = datetime.utcnow() - timedelta(days=days)
    
    events_query = (
        select(Event)
        .options(selectinload(Event.source), selectinload(Event.tags))
        .where(
            Event.published_at >= start_date,
            Event.importance_score >= min_score
        )
        .order_by(Event.importance_score.desc())
        .limit(limit)
    )
    
    events_result = await db.execute(events_query)
    events = events_result.scalars().all()
    
    # Build nodes
    nodes = []
    event_ids = []
    for event in events:
        event_ids.append(event.id)
        nodes.append(GraphNode(
            id=str(event.id),
            title=event.title[:100],  # Truncate long titles
            url=event.url,
            category=event.category,
            importance_score=event.importance_score,
            published_at=event.published_at.isoformat(),
            source_name=event.source.name if event.source else None
        ))
    
    # Get relationships between these events
    edges = []
    if event_ids:
        relationships_query = (
            select(EventRelationship)
            .where(
                EventRelationship.source_event_id.in_(event_ids),
                EventRelationship.target_event_id.in_(event_ids)
            )
            .limit(100)
        )
        
        rels_result = await db.execute(relationships_query)
        relationships = rels_result.scalars().all()
        
        for rel in relationships:
            edges.append(GraphEdge(
                source=str(rel.source_event_id),
                target=str(rel.target_event_id),
                relationship_type=rel.relationship_type or "related",
                weight=rel.weight
            ))
    
    return GraphData(nodes=nodes, edges=edges)


@router.get("/related/{event_id}", response_model=List[RelatedEvent])
async def get_related_events(
    event_id: UUID,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get related events for a specific event."""
    # Get direct relationships
    query = (
        select(Event, EventRelationship)
        .join(
            EventRelationship,
            (EventRelationship.source_event_id == event_id) | 
            (EventRelationship.target_event_id == event_id)
        )
        .options(selectinload(Event.source))
        .limit(limit * 2)  # Get more to filter
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    related_events = []
    seen_ids = set()
    
    for event, relationship in rows:
        if str(event.id) == str(event_id):
            continue
        if event.id in seen_ids:
            continue
            
        seen_ids.add(event.id)
        
        # Determine relationship type
        rel_type = relationship.relationship_type or "related"
        
        related_events.append(RelatedEvent(
            id=str(event.id),
            title=event.title[:100],
            category=event.category,
            importance_score=event.importance_score,
            relationship_type=rel_type,
            weight=relationship.weight
        ))
    
    # Also find events with same tags (tag-based relationships)
    event = await db.get(Event, event_id)
    if event:
        # Get event's tags
        event_query = select(Event).options(selectinload(Event.tags)).where(Event.id == event_id)
        event_result = await db.execute(event_query)
        event_with_tags = event_result.scalar_one_or_none()
        
        if event_with_tags and event_with_tags.tags:
            tag_ids = [tag.id for tag in event_with_tags.tags]
            
            # Find other events with same tags
            tag_events_query = (
                select(Event)
                .join(EventTag)
                .where(
                    EventTag.tag_id.in_(tag_ids),
                    Event.id != event_id
                )
                .options(selectinload(Event.source))
                .limit(limit)
            )
            
            tag_result = await db.execute(tag_events_query)
            tag_events = tag_result.scalars().all()
            
            for te in tag_events:
                if str(te.id) not in seen_ids and len(related_events) < limit:
                    seen_ids.add(te.id)
                    related_events.append(RelatedEvent(
                        id=str(te.id),
                        title=te.title[:100],
                        category=te.category,
                        importance_score=te.importance_score,
                        relationship_type="same_tag",
                        weight=0.5
                    ))
    
    # Sort by importance score
    related_events.sort(key=lambda x: x.importance_score, reverse=True)
    
    return related_events[:limit]


@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get list of all event categories with counts."""
    query = (
        select(Event.category, func.count(Event.id))
        .where(Event.category.isnot(None))
        .group_by(Event.category)
        .order_by(func.count(Event.id).desc())
    )
    
    result = await db.execute(query)
    categories = [{"name": row[0], "count": row[1]} for row in result.all()]
    
    return {"categories": categories}
