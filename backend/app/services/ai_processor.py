"""AI processing service - summarization, classification, tagging."""
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models import Event, Tag

settings = get_settings()
logger = logging.getLogger(__name__)


class AIProcessor:
    """Service for AI-powered event processing."""
    
    CATEGORIES = [
        "research",      # Academic papers, discoveries
        "product",       # Product launches, releases
        "funding",       # Investments, acquisitions
        "announcement",  # Major announcements
        "tool",          # New tools, libraries
        "partnership",   # Collaborations
        "ethics",        # AI safety, policy
    ]
    
    KEYWORDS = {
        "research": ["paper", "arxiv", "published", "study", "research", "discover"],
        "product": ["launch", "release", "announce", "introduce", "new", "feature"],
        "funding": ["funding", "invest", "raise", "series", "valuation", "acquire"],
        "announcement": ["announce", "reveal", "unveil", "breaking", "major"],
        "tool": ["library", "framework", "tool", "sdk", "api", "dataset"],
        "partnership": ["partner", "collaboration", "team up", "join forces"],
        "ethics": ["safety", "ethics", "policy", "regulation", "bias", "fairness"],
    }
    
    async def process_event(self, event: Event) -> Dict[str, Any]:
        """Process a single event with AI."""
        results = {
            "summary": None,
            "category": None,
            "tags": [],
            "sentiment": None,
        }
        
        # Generate summary (placeholder - would use LLM in production)
        if not event.summary or len(event.summary) < 50:
            results["summary"] = await self._generate_summary(event)
        else:
            results["summary"] = event.summary
        
        # Classify category
        results["category"] = await self._classify_category(event)
        
        # Extract tags
        results["tags"] = await self._extract_tags(event)
        
        # Calculate sentiment
        results["sentiment"] = await self._calculate_sentiment(event)
        
        return results
    
    async def _generate_summary(self, event: Event) -> str:
        """Generate AI summary of event."""
        # In production, this would call OpenAI/Anthropic API
        # For now, use a simple extractive summary
        content = event.content or event.summary or ""
        
        if len(content) <= 200:
            return content
        
        # Simple extractive summary - first 200 chars
        summary = content[:200].rsplit(" ", 1)[0] + "..."
        return summary
    
    async def _classify_category(self, event: Event) -> str:
        """Classify event into a category."""
        text = f"{event.title} {event.summary or ''} {event.content or ''}".lower()
        
        scores = {}
        for category in self.CATEGORIES:
            score = 0
            keywords = self.KEYWORDS.get(category, [])
            for keyword in keywords:
                if keyword in text:
                    score += 1
            scores[category] = score
        
        if not scores or max(scores.values()) == 0:
            return "announcement"
        
        return max(scores, key=scores.get)
    
    async def _extract_tags(self, event: Event) -> List[str]:
        """Extract relevant tags from event."""
        text = f"{event.title} {event.summary or ''}".lower()
        
        extracted_tags = []
        
        # Brand detection
        brands = ["gpt", "claude", "gemini", "llama", "mistral", "bard", "palm", "anthropic", "openai", "deepmind"]
        for brand in brands:
            if brand in text:
                extracted_tags.append(brand)
        
        # Technology detection
        tech = ["llm", "gpt", "transformer", "diffusion", "multimodal", "rag", "fine-tuning", "embedding"]
        for t in tech:
            if t in text:
                extracted_tags.append(t)
        
        # Application detection
        apps = ["code", "image", "video", "audio", "speech", "translation", "medical", "robotics"]
        for app in apps:
            if app in text:
                extracted_tags.append(app)
        
        return list(set(extracted_tags))
    
    async def _calculate_sentiment(self, event: Event) -> float:
        """Calculate sentiment score (-1 to 1)."""
        text = f"{event.title} {event.summary or ''}".lower()
        
        positive_words = [
            "breakthrough", "revolutionary", "amazing", "impressive", "launch", "release",
            "success", "achievement", "innovation", "advance", "improve", "powerful"
        ]
        
        negative_words = [
            "fail", "problem", "issue", "bug", "vulnerability", "risk", "concern",
            "warning", "lawsuit", "controversy", "backlash", "criticism"
        ]
        
        score = 0
        for word in positive_words:
            if word in text:
                score += 0.1
        
        for word in negative_words:
            if word in text:
                score -= 0.1
        
        return max(-1.0, min(1.0, score))
    
    async def process_batch(self, event_ids: List[UUID]) -> Dict[str, Any]:
        """Process a batch of events."""
        from app.database import AsyncSessionLocal
        
        results = {
            "processed": 0,
            "failed": 0,
            "events": []
        }
        
        async with AsyncSessionLocal() as db:
            for event_id in event_ids:
                try:
                    # Get event
                    event = await db.get(Event, event_id)
                    if not event:
                        results["failed"] += 1
                        continue
                    
                    # Process event
                    processing_results = await self.process_event(event)
                    
                    # Update event
                    event.summary = processing_results["summary"]
                    event.category = processing_results["category"]
                    event.sentiment_score = processing_results["sentiment"]
                    event.is_processed = True
                    
                    # Add tags
                    tag_slugs = processing_results["tags"]
                    if tag_slugs:
                        tag_query = select(Tag).where(Tag.slug.in_(tag_slugs))
                        tag_result = await db.execute(tag_query)
                        tags = tag_result.scalars().all()
                        event.tags = list(tags)
                    
                    await db.commit()
                    results["processed"] += 1
                    results["events"].append({
                        "id": str(event_id),
                        "status": "processed",
                        "category": event.category
                    })
                    
                except Exception as e:
                    logger.error(f"Error processing event {event_id}: {e}")
                    results["failed"] += 1
                    results["events"].append({
                        "id": str(event_id),
                        "status": "failed",
                        "error": str(e)
                    })
        
        return results
    
    async def process_unprocessed(self, limit: int = 50) -> Dict[str, Any]:
        """Process all unprocessed events."""
        from app.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            # Get unprocessed events
            query = (
                select(Event.id)
                .where(Event.is_processed == False)
                .limit(limit)
            )
            result = await db.execute(query)
            event_ids = [row[0] for row in result.all()]
        
        if not event_ids:
            return {"processed": 0, "failed": 0, "message": "No events to process"}
        
        return await self.process_batch(event_ids)


# Singleton instance
ai_processor = AIProcessor()


async def get_ai_processor() -> AIProcessor:
    """Get AI processor instance."""
    return ai_processor
