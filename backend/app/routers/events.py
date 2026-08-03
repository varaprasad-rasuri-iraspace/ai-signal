"""Events API router."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Event, Tag, Source
from app.schemas import (
    EventCreate, EventUpdate, EventResponse, EventListResponse,
    EventRelationshipCreate, EventRelationshipResponse
)

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=EventListResponse)
async def get_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    source_id: Optional[UUID] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get paginated list of events."""
    # Build query
    query = select(Event).options(selectinload(Event.source), selectinload(Event.tags))
    
    # Apply filters
    if category:
        query = query.where(Event.category == category)
    if source_id:
        query = query.where(Event.source_id == source_id)
    if min_score is not None:
        query = query.where(Event.importance_score >= min_score)
    if max_score is not None:
        query = query.where(Event.importance_score <= max_score)
    if search:
        query = query.where(Event.title.ilike(f"%{search}%"))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination and ordering
    query = query.order_by(Event.published_at.desc())
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


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single event by ID."""
    query = select(Event).options(
        selectinload(Event.source),
        selectinload(Event.tags)
    ).where(Event.id == event_id)
    
    result = await db.execute(query)
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return EventResponse.model_validate(event)


@router.post("", response_model=EventResponse, status_code=201)
async def create_event(event_data: EventCreate, db: AsyncSession = Depends(get_db)):
    """Create a new event."""
    # Check for duplicate URL
    existing = await db.execute(
        select(Event).where(Event.url == event_data.url)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Event with this URL already exists")
    
    # Create event
    event = Event(**event_data.model_dump(exclude={"tag_ids"}))
    db.add(event)
    await db.commit()
    await db.refresh(event)
    
    # Add tags if provided
    if event_data.tag_ids:
        tag_query = select(Tag).where(Tag.id.in_(event_data.tag_ids))
        tag_result = await db.execute(tag_query)
        tags = tag_result.scalars().all()
        event.tags = list(tags)
        await db.commit()
    
    # Reload with relationships
    query = select(Event).options(
        selectinload(Event.source),
        selectinload(Event.tags)
    ).where(Event.id == event.id)
    result = await db.execute(query)
    event = result.scalar_one()
    
    return EventResponse.model_validate(event)


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: UUID,
    event_data: EventUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing event."""
    query = select(Event).where(Event.id == event_id)
    result = await db.execute(query)
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Update fields
    update_data = event_data.model_dump(exclude_unset=True, exclude={"tag_ids"})
    for field, value in update_data.items():
        setattr(event, field, value)
    
    # Update tags if provided
    if event_data.tag_ids is not None:
        tag_query = select(Tag).where(Tag.id.in_(event_data.tag_ids))
        tag_result = await db.execute(tag_query)
        tags = tag_result.scalars().all()
        event.tags = list(tags)
    
    await db.commit()
    await db.refresh(event)
    
    # Reload with relationships
    query = select(Event).options(
        selectinload(Event.source),
        selectinload(Event.tags)
    ).where(Event.id == event.id)
    result = await db.execute(query)
    event = result.scalar_one()
    
    return EventResponse.model_validate(event)


@router.delete("/{event_id}", status_code=204)
async def delete_event(event_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete an event."""
    query = select(Event).where(Event.id == event_id)
    result = await db.execute(query)
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await db.delete(event)
    await db.commit()
    
    return None


@router.get("/search", response_model=EventListResponse)
async def search_events(
    q: str = Query(..., min_length=2),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Search events by title or summary."""
    query = select(Event).options(
        selectinload(Event.source),
        selectinload(Event.tags)
    ).where(
        Event.title.ilike(f"%{q}%") | Event.summary.ilike(f"%{q}%")
    ).order_by(Event.published_at.desc())
    
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


@router.post("/relationships", response_model=EventRelationshipResponse)
async def create_relationship(
    rel_data: EventRelationshipCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a relationship between two events."""
    from app.models import EventRelationship
    
    # Verify both events exist
    event1 = await db.get(Event, rel_data.source_event_id)
    event2 = await db.get(Event, rel_data.target_event_id)
    
    if not event1 or not event2:
        raise HTTPException(status_code=404, detail="One or both events not found")
    
    # Create relationship
    relationship = EventRelationship(**rel_data.model_dump())
    db.add(relationship)
    await db.commit()
    await db.refresh(relationship)
    
    return EventRelationshipResponse.model_validate(relationship)


@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get list of all event categories."""
    query = select(Event.category).distinct().where(Event.category.isnot(None))
    result = await db.execute(query)
    categories = [row[0] for row in result.all()]
    
    return {"categories": categories}


@router.post("/recalculate-scores")
async def recalculate_scores(
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Recalculate importance scores for recent events."""
    import logging
    from app.services.scorer import importance_scorer
    
    logger = logging.getLogger(__name__)
    
    # Get recent events
    query = (
        select(Event)
        .options(selectinload(Event.source))
        .order_by(Event.published_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    events = result.scalars().all()
    
    processed = 0
    failed = 0
    scores = []
    errors = []
    
    for event in events:
        try:
            score = await importance_scorer.calculate_score(event, event.source)
            event.importance_score = score
            scores.append(score)
            processed += 1
        except Exception as e:
            logger.error(f"Error scoring event {event.id}: {e}", exc_info=True)
            errors.append(f"{event.id}: {str(e)}")
            failed += 1
    
    await db.commit()
    
    avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0
    
    return {
        "status": "success",
        "processed": processed,
        "failed": failed,
        "avg_score": avg_score,
        "errors": errors[:5] if errors else [],  # Return first 5 errors
        "message": f"Recalculated scores for {processed} events"
    }
