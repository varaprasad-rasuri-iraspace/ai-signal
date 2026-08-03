"""SQLAlchemy database models."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Boolean, Float, DateTime, ForeignKey, JSON, UniqueConstraint, Index, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class Source(Base):
    """Source model for data ingestion sources."""
    __tablename__ = "sources"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # research, news, blog, github, social
    url = Column(String(500), nullable=False, unique=True)
    reliability_score = Column(Float, default=0.5)
    fetch_interval_minutes = Column(Integer, default=60)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    events = relationship("Event", back_populates="source")
    ingestion_logs = relationship("IngestionLog", back_populates="source")


class Event(Base):
    """Event model for AI developments/events."""
    __tablename__ = "events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    summary = Column(Text)
    content = Column(Text)
    url = Column(String(500), nullable=False, unique=True)
    image_url = Column(String(500))
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"))
    published_at = Column(DateTime(timezone=True), nullable=False)
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())
    category = Column(String(50))  # research, product, funding, announcement, tool
    importance_score = Column(Float, default=0.0)
    sentiment_score = Column(Float)  # -1 to 1
    raw_payload = Column(JSONB)
    is_processed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    source = relationship("Source", back_populates="events")
    tags = relationship("Tag", secondary="event_tags", back_populates="events")
    source_relationships = relationship(
        "EventRelationship",
        foreign_keys="EventRelationship.source_event_id",
        back_populates="source_event"
    )
    target_relationships = relationship(
        "EventRelationship",
        foreign_keys="EventRelationship.target_event_id",
        back_populates="target_event"
    )
    
    __table_args__ = (
        Index("idx_events_published_at", "published_at"),
        Index("idx_events_importance_score", "importance_score"),
        Index("idx_events_category", "category"),
    )


class Tag(Base):
    """Tag model for event categorization."""
    __tablename__ = "tags"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    category = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    events = relationship("Event", secondary="event_tags", back_populates="tags")


class EventTag(Base):
    """Junction table for events and tags."""
    __tablename__ = "event_tags"
    
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class EventRelationship(Base):
    """Event relationship model for linking related events."""
    __tablename__ = "event_relationships"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    target_event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(String(50))  # related, cites, follows, competitor, funding
    weight = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    source_event = relationship("Event", foreign_keys=[source_event_id], back_populates="source_relationships")
    target_event = relationship("Event", foreign_keys=[target_event_id], back_populates="target_relationships")
    
    __table_args__ = (
        UniqueConstraint("source_event_id", "target_event_id", "relationship_type", name="uq_event_relationship"),
    )


class User(Base):
    """User model for authentication."""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    username = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user")  # user, admin
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    api_keys = relationship("APIKey", back_populates="user")


class APIKey(Base):
    """API Key model for external API access."""
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    key_hash = Column(String(255), nullable=False, unique=True)
    name = Column(String(100))
    rate_limit = Column(Integer, default=100)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="api_keys")


class IngestionLog(Base):
    """Ingestion log model for tracking data fetching."""
    __tablename__ = "ingestion_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"))
    status = Column(String(20))  # success, failed, partial
    items_fetched = Column(Integer, default=0)
    items_added = Column(Integer, default=0)
    error_message = Column(Text)
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    source = relationship("Source", back_populates="ingestion_logs")
