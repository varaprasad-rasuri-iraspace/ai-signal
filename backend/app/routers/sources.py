"""Sources API router."""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Source, IngestionLog
from app.schemas import SourceCreate, SourceUpdate, SourceResponse, IngestionLogResponse

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("", response_model=List[SourceResponse])
async def get_sources(
    is_active: Optional[bool] = None,
    source_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get list of all sources."""
    try:
        query = select(Source)
        
        if is_active is not None:
            query = query.where(Source.is_active == is_active)
        if source_type:
            query = query.where(Source.type == source_type)
        
        query = query.order_by(Source.name)
        result = await db.execute(query)
        sources = result.scalars().all()
        
        return [SourceResponse.model_validate(s) for s in sources]
    except Exception as e:
        import logging
        import traceback
        logging.error(f"Error fetching sources: {e}\n{traceback.format_exc()}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/{source_id}", response_model=SourceResponse)
async def get_source(source_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single source by ID."""
    source = await db.get(Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    return SourceResponse.model_validate(source)


@router.post("", response_model=SourceResponse, status_code=201)
async def create_source(source_data: SourceCreate, db: AsyncSession = Depends(get_db)):
    """Create a new source."""
    # Check for duplicate URL
    existing = await db.execute(
        select(Source).where(Source.url == source_data.url)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Source with this URL already exists")
    
    # Create source
    source = Source(**source_data.model_dump())
    db.add(source)
    await db.commit()
    await db.refresh(source)
    
    return SourceResponse.model_validate(source)


@router.patch("/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: UUID,
    source_data: SourceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing source."""
    source = await db.get(Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Update fields
    update_data = source_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(source, field, value)
    
    await db.commit()
    await db.refresh(source)
    
    return SourceResponse.model_validate(source)


@router.delete("/{source_id}", status_code=204)
async def delete_source(source_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a source."""
    source = await db.get(Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    await db.delete(source)
    await db.commit()
    
    return None


@router.get("/{source_id}/logs", response_model=List[IngestionLogResponse])
async def get_source_logs(
    source_id: UUID,
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get ingestion logs for a source."""
    query = select(IngestionLog).where(
        IngestionLog.source_id == source_id
    ).order_by(IngestionLog.started_at.desc()).limit(limit)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return [IngestionLogResponse.model_validate(l) for l in logs]


@router.get("/types")
async def get_source_types(db: AsyncSession = Depends(get_db)):
    """Get list of all source types."""
    query = select(Source.type).distinct()
    result = await db.execute(query)
    types = [row[0] for row in result.all()]
    
    return {"types": types}
