"""Pydantic schemas for API validation."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, HttpUrl


# Base schemas
class SourceBase(BaseModel):
    """Base source schema."""
    name: str
    type: str
    url: str
    reliability_score: float = 0.5
    fetch_interval_minutes: int = 60
    is_active: bool = True


class SourceCreate(SourceBase):
    """Source creation schema."""
    pass


class SourceUpdate(BaseModel):
    """Source update schema."""
    name: Optional[str] = None
    type: Optional[str] = None
    reliability_score: Optional[float] = None
    fetch_interval_minutes: Optional[int] = None
    is_active: Optional[bool] = None


class SourceResponse(SourceBase):
    """Source response schema."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Tag schemas
class TagBase(BaseModel):
    """Base tag schema."""
    name: str
    slug: str
    category: Optional[str] = None


class TagCreate(TagBase):
    """Tag creation schema."""
    pass


class TagResponse(TagBase):
    """Tag response schema."""
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Event schemas
class EventBase(BaseModel):
    """Base event schema."""
    title: str
    summary: Optional[str] = None
    content: Optional[str] = None
    url: str
    image_url: Optional[str] = None
    source_id: Optional[UUID] = None
    published_at: datetime
    category: Optional[str] = None
    importance_score: float = 0.0
    sentiment_score: Optional[float] = None
    is_processed: bool = False


class EventCreate(EventBase):
    """Event creation schema."""
    tag_ids: Optional[List[UUID]] = None


class EventUpdate(BaseModel):
    """Event update schema."""
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    importance_score: Optional[float] = None
    sentiment_score: Optional[float] = None
    is_processed: Optional[bool] = None
    tag_ids: Optional[List[UUID]] = None


class EventResponse(EventBase):
    """Event response schema."""
    id: UUID
    ingested_at: datetime
    created_at: datetime
    updated_at: datetime
    source: Optional[SourceResponse] = None
    tags: List[TagResponse] = []
    
    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    """Event list response schema."""
    events: List[EventResponse]
    total: int
    page: int
    page_size: int
    has_next: bool


# Event relationship schemas
class EventRelationshipBase(BaseModel):
    """Base event relationship schema."""
    source_event_id: UUID
    target_event_id: UUID
    relationship_type: str
    weight: float = 1.0


class EventRelationshipCreate(EventRelationshipBase):
    """Event relationship creation schema."""
    pass


class EventRelationshipResponse(EventRelationshipBase):
    """Event relationship response schema."""
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Feed schemas
class FeedFilter(BaseModel):
    """Feed filter schema."""
    category: Optional[str] = None
    tag_slug: Optional[str] = None
    source_id: Optional[UUID] = None
    min_score: Optional[float] = None
    max_score: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None


class FeedRequest(FeedFilter):
    """Feed request schema."""
    page: int = 1
    page_size: int = 20


class HeatmapData(BaseModel):
    """Heatmap data schema."""
    date: str
    count: int
    avg_score: float


class RadarSignal(BaseModel):
    """Radar signal schema."""
    id: UUID
    title: str
    category: str
    importance_score: float
    published_at: datetime
    source_name: str


# Ingestion schemas
class IngestionLogResponse(BaseModel):
    """Ingestion log response schema."""
    id: UUID
    source_id: Optional[UUID]
    status: str
    items_fetched: int
    items_added: int
    error_message: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Stats schemas
class StatsResponse(BaseModel):
    """Stats response schema."""
    total_events: int
    total_sources: int
    total_tags: int
    events_today: int
    avg_importance_score: float
    category_breakdown: dict
    top_tags: List[dict]


# Error response
class ErrorResponse(BaseModel):
    """Error response schema."""
    detail: str
    code: Optional[str] = None
