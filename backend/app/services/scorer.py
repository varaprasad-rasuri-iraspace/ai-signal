"""Importance scoring service."""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models import Event, Source

settings = get_settings()
logger = logging.getLogger(__name__)


class ImportanceScorer:
    """Service for calculating importance scores."""
    
    # Base scores by source type
    SOURCE_TYPE_BASE_SCORES = {
        "research": 20,
        "blog": 15,
        "news": 10,
        "social": 5,
        "github": 8,
    }
    
    # Category multipliers
    CATEGORY_MULTIPLIERS = {
        "research": 1.5,
        "funding": 1.3,
        "product": 1.2,
        "announcement": 1.0,
        "tool": 1.1,
        "partnership": 1.2,
        "ethics": 1.4,
    }
    
    # Keyword boost scores
    KEYWORD_BOOSTS = {
        # Major breakthroughs
        "breakthrough": 15,
        "revolutionary": 12,
        "state-of-the-art": 10,
        "sota": 10,
        "first": 8,
        
        # Important companies/AI names
        "openai": 8,
        "anthropic": 8,
        "deepmind": 8,
        "google": 5,
        "meta": 5,
        "microsoft": 5,
        "nvidia": 6,
        
        # Important terms
        "gpt": 7,
        "llm": 7,
        "transformer": 5,
        "multimodal": 6,
        "agi": 10,
        "safety": 8,
    }
    
    async def calculate_score(self, event: Event, source: Source = None) -> float:
        """Calculate importance score for an event."""
        score = 50.0  # Base score
        
        # 1. Source reliability (0-20 points)
        if source:
            score += source.reliability_score * 20
        
        # 2. Source type base score
        if source:
            source_type = source.type.lower()
            base_score = self.SOURCE_TYPE_BASE_SCORES.get(source_type, 10)
            score += base_score
        
        # 3. Category multiplier
        if event.category:
            multiplier = self.CATEGORY_MULTIPLIERS.get(event.category.lower(), 1.0)
            score *= multiplier
        
        # 4. Keyword boosts
        text = f"{event.title} {event.summary or ''}".lower()
        for keyword, boost in self.KEYWORD_BOOSTS.items():
            if keyword in text:
                score += boost
        
        # 5. Content length bonus
        content_length = len(event.content or event.summary or "")
        if content_length > 500:
            score += 5
        if content_length > 1000:
            score += 10
        
        # 6. Time decay
        try:
            # Handle both timezone-aware and naive datetimes
            now = datetime.now(event.published_at.tzinfo) if event.published_at.tzinfo else datetime.utcnow()
            hours_old = (now - event.published_at).total_seconds() / 3600
            decay_factor = 1.0 / (1.0 + settings.time_decay_factor * hours_old)
            score *= decay_factor
        except Exception as e:
            logger.warning(f"Error calculating time decay: {e}")
            # Skip time decay if there's an error
        
        # 7. Sentiment boost (positive sentiment slightly higher)
        if event.sentiment_score and event.sentiment_score > 0.5:
            score *= 1.1
        
        # Clamp score
        score = max(settings.min_importance_score, min(settings.max_importance_score, score))
        
        return round(score, 2)
    
    async def recalculate_all_scores(self, limit: int = 100) -> Dict[str, Any]:
        """Recalculate scores for recent events."""
        from app.database import AsyncSessionLocal
        
        results = {
            "processed": 0,
            "failed": 0,
            "avg_score": 0.0
        }
        
        scores = []
        
        async with AsyncSessionLocal() as db:
            # Get recent events
            query = (
                select(Event)
                .options(selectinload(Event.source))
                .where(Event.published_at >= datetime.utcnow() - timedelta(days=30))
                .order_by(Event.published_at.desc())
                .limit(limit)
            )
            result = await db.execute(query)
            events = result.scalars().all()
            
            for event in events:
                try:
                    source = event.source if event.source_id else None
                    new_score = await self.calculate_score(event, source)
                    
                    event.importance_score = new_score
                    scores.append(new_score)
                    results["processed"] += 1
                    
                except Exception as e:
                    logger.error(f"Error scoring event {event.id}: {e}")
                    results["failed"] += 1
            
            await db.commit()
        
        if scores:
            results["avg_score"] = round(sum(scores) / len(scores), 2)
        
        return results
    
    async def score_event(self, event_id: UUID) -> Dict[str, Any]:
        """Score a single event."""
        from app.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            event = await db.get(Event, event_id)
            if not event:
                return {"error": "Event not found"}
            
            # Get source
            source = None
            if event.source_id:
                source = await db.get(Source, event.source_id)
            
            # Calculate score
            score = await self.calculate_score(event, source)
            event.importance_score = score
            await db.commit()
            
            return {
                "event_id": str(event_id),
                "importance_score": score
            }


# Singleton instance
importance_scorer = ImportanceScorer()


async def get_importance_scorer() -> ImportanceScorer:
    """Get importance scorer instance."""
    return importance_scorer
