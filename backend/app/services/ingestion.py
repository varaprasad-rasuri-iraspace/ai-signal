"""Data ingestion service - fetches data from various sources."""
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID
import aiohttp
import feedparser
from bs4 import BeautifulSoup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Source, Event, IngestionLog
from app.database import AsyncSessionLocal

settings = get_settings()
logger = logging.getLogger(__name__)


class IngestionService:
    """Service for ingesting data from various sources."""
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session."""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=settings.request_timeout)
            )
        return self.session
    
    async def close(self):
        """Close HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def fetch_rss_feed(self, source: Source) -> List[Dict[str, Any]]:
        """Fetch and parse RSS/Atom feed."""
        items = []
        try:
            session = await self.get_session()
            async with session.get(source.url) as response:
                if response.status != 200:
                    logger.warning(f"Failed to fetch {source.url}: {response.status}")
                    return items
                
                content = await response.text()
                feed = feedparser.parse(content)
                
                for entry in feed.entries[:50]:  # Limit to 50 items for better historical coverage
                    item = {
                        "title": entry.get("title", "").strip(),
                        "url": entry.get("link", "").strip(),
                        "summary": entry.get("summary", "").strip(),
                        "content": entry.get("content", [{"value": ""}])[0].get("value", ""),
                        "published_at": self._parse_date(entry.get("published", "")),
                        "source_id": source.id,
                    }
                    
                    # Extract image if available
                    if hasattr(entry, 'media_content'):
                        item["image_url"] = entry.media_content[0].get("url")
                    elif hasattr(entry, 'media_thumbnail'):
                        item["image_url"] = entry.media_thumbnail[0].get("url")
                    
                    items.append(item)
                    
        except Exception as e:
            logger.error(f"Error fetching RSS feed {source.url}: {e}")
        
        return items
    
    async def fetch_html_page(self, source: Source) -> List[Dict[str, Any]]:
        """Fetch and parse HTML page (for sources without RSS)."""
        items = []
        try:
            session = await self.get_session()
            async with session.get(source.url) as response:
                if response.status != 200:
                    logger.warning(f"Failed to fetch {source.url}: {response.status}")
                    return items
                
                content = await response.text()
                soup = BeautifulSoup(content, "lxml")
                
                # This is a generic parser - would need customization per source
                # For now, return empty list as HTML parsing requires source-specific logic
                logger.info(f"HTML parsing not implemented for {source.url}")
                
        except Exception as e:
            logger.error(f"Error fetching HTML page {source.url}: {e}")
        
        return items
    
    def _parse_date(self, date_str: str) -> datetime:
        """Parse date string to datetime."""
        if not date_str:
            return datetime.utcnow()
        
        from dateparser import parse
        parsed = parse(date_str)
        return parsed if parsed else datetime.utcnow()
    
    async def ingest_source(self, source_id: UUID) -> Dict[str, Any]:
        """Ingest data from a specific source."""
        async with AsyncSessionLocal() as db:
            # Get source
            source = await db.get(Source, source_id)
            if not source or not source.is_active:
                return {"status": "skipped", "items_fetched": 0, "items_added": 0}
            
            # Create ingestion log
            log = IngestionLog(
                source_id=source_id,
                status="running",
                started_at=datetime.utcnow()
            )
            db.add(log)
            await db.commit()
            await db.refresh(log)
            
            items = []
            try:
                # Fetch based on source type
                if source.type in ["blog", "news", "research", "social"]:
                    if "rss" in source.url or "feed" in source.url or "atom" in source.url or "xml" in source.url or source.url.endswith(".xml"):
                        items = await self.fetch_rss_feed(source)
                    else:
                        items = await self.fetch_html_page(source)
                
                logger.info(f"Fetched {len(items)} items from {source.name}")
                
            except Exception as e:
                logger.error(f"Error ingesting source {source.name}: {e}")
                log.status = "failed"
                log.error_message = str(e)
                log.completed_at = datetime.utcnow()
                await db.commit()
                return {"status": "failed", "items_fetched": 0, "items_added": 0}
            
            # Process and store items
            items_added = 0
            new_events = []
            for item in items:
                try:
                    # Check for duplicate
                    existing = await db.execute(
                        select(Event).where(Event.url == item["url"])
                    )
                    if existing.scalar_one_or_none():
                        continue
                    
                    # Convert datetime and UUID to strings for JSON storage
                    raw_payload = {
                        "title": item.get("title", ""),
                        "url": item.get("url", ""),
                        "summary": item.get("summary", ""),
                        "content": item.get("content", ""),
                        "image_url": item.get("image_url"),
                        "published_at": item["published_at"].isoformat() if isinstance(item["published_at"], datetime) else str(item["published_at"]),
                        "source_id": str(item["source_id"])
                    }
                    
                    # Create event
                    event = Event(
                        title=item["title"],
                        url=item["url"],
                        summary=item.get("summary", "")[:500],
                        content=item.get("content", ""),
                        image_url=item.get("image_url"),
                        source_id=source.id,
                        published_at=item["published_at"],
                        raw_payload=raw_payload
                    )
                    db.add(event)
                    new_events.append(event)
                    items_added += 1
                    
                except Exception as e:
                    logger.error(f"Error processing item: {e}")
                    continue
            
            # Commit to get event IDs
            await db.commit()
            
            # Process new events with AI (categorization, tags, sentiment)
            if new_events:
                from app.services.ai_processor import ai_processor
                from app.services.scorer import importance_scorer
                
                for event in new_events:
                    try:
                        await db.refresh(event)
                        
                        # AI processing (category, tags, sentiment)
                        processing_results = await ai_processor.process_event(event)
                        event.category = processing_results["category"]
                        event.sentiment_score = processing_results["sentiment"]
                        event.is_processed = True
                        
                        # Add tags
                        if processing_results["tags"]:
                            from app.models import Tag
                            tag_slugs = processing_results["tags"]
                            tag_query = select(Tag).where(Tag.slug.in_(tag_slugs))
                            tag_result = await db.execute(tag_query)
                            tags = tag_result.scalars().all()
                            if tags:
                                event.tags = list(tags)
                        
                        # Calculate importance score
                        score = await importance_scorer.calculate_score(event, source)
                        event.importance_score = score
                        
                    except Exception as e:
                        logger.error(f"Error processing event {event.id}: {e}")
                
                await db.commit()
            
            # Update log
            log.status = "success"
            log.items_fetched = len(items)
            log.items_added = items_added
            log.completed_at = datetime.utcnow()
            await db.commit()
            
            return {
                "status": "success",
                "items_fetched": len(items),
                "items_added": items_added,
                "source": source.name
            }
    
    async def ingest_all_sources(self) -> List[Dict[str, Any]]:
        """Ingest data from all active sources."""
        async with AsyncSessionLocal() as db:
            # Get all active sources
            query = select(Source).where(Source.is_active == True)
            result = await db.execute(query)
            sources = result.scalars().all()
        
        results = []
        for source in sources:
            result = await self.ingest_source(source.id)
            results.append(result)
        
        return results
    
    async def run_scheduled_ingestion(self):
        """Run scheduled ingestion job."""
        logger.info("Starting scheduled ingestion...")
        results = await self.ingest_all_sources()
        
        total_fetched = sum(r.get("items_fetched", 0) for r in results)
        total_added = sum(r.get("items_added", 0) for r in results)
        
        logger.info(f"Ingestion complete: {total_fetched} fetched, {total_added} added")
        return results


# Singleton instance
ingestion_service = IngestionService()


async def get_ingestion_service() -> IngestionService:
    """Get ingestion service instance."""
    return ingestion_service
