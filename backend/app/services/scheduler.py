"""Scheduler service for running background tasks."""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime

from app.services.ingestion import ingestion_service
from app.services.ai_processor import ai_processor
from app.services.scorer import importance_scorer

logger = logging.getLogger(__name__)


class SchedulerService:
    """Service for managing scheduled background tasks."""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
    
    def setup_jobs(self):
        """Set up all scheduled jobs."""
        
        # High priority sources - every 15 minutes
        self.scheduler.add_job(
            self.ingest_high_priority,
            trigger=IntervalTrigger(minutes=15),
            id="ingest_high_priority",
            name="Ingest high priority sources",
            replace_existing=True
        )
        
        # Medium priority sources - every 30 minutes
        self.scheduler.add_job(
            self.ingest_medium_priority,
            trigger=IntervalTrigger(minutes=30),
            id="ingest_medium_priority",
            name="Ingest medium priority sources",
            replace_existing=True
        )
        
        # Low priority sources - every 60 minutes
        self.scheduler.add_job(
            self.ingest_low_priority,
            trigger=IntervalTrigger(minutes=60),
            id="ingest_low_priority",
            name="Ingest low priority sources",
            replace_existing=True
        )
        
        # AI processing - every 10 minutes
        self.scheduler.add_job(
            self.process_events,
            trigger=IntervalTrigger(minutes=10),
            id="process_events",
            name="Process events with AI",
            replace_existing=True
        )
        
        # Score recalculation - every hour
        self.scheduler.add_job(
            self.recalculate_scores,
            trigger=IntervalTrigger(minutes=60),
            id="recalculate_scores",
            name="Recalculate importance scores",
            replace_existing=True
        )
        
        # Daily cleanup - midnight
        self.scheduler.add_job(
            self.daily_cleanup,
            trigger=CronTrigger(hour=0, minute=0),
            id="daily_cleanup",
            name="Daily cleanup",
            replace_existing=True
        )
        
        logger.info("Scheduled jobs configured")
    
    async def start(self):
        """Start the scheduler."""
        if not self.is_running:
            self.setup_jobs()
            self.scheduler.start()
            self.is_running = True
            logger.info("Scheduler started")
    
    async def stop(self):
        """Stop the scheduler."""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("Scheduler stopped")
    
    async def ingest_high_priority(self):
        """Ingest from high-priority sources (social media, news)."""
        logger.info("Running high-priority ingestion...")
        try:
            from app.database import AsyncSessionLocal
            from sqlalchemy import select
            from app.models import Source
            
            async with AsyncSessionLocal() as db:
                # Get high-priority sources (social, news with short intervals)
                query = select(Source).where(
                    Source.is_active == True,
                    Source.fetch_interval_minutes <= 15
                )
                result = await db.execute(query)
                sources = result.scalars().all()
            
            for source in sources:
                await ingestion_service.ingest_source(source.id)
                
        except Exception as e:
            logger.error(f"Error in high-priority ingestion: {e}")
    
    async def ingest_medium_priority(self):
        """Ingest from medium-priority sources (blogs)."""
        logger.info("Running medium-priority ingestion...")
        try:
            from app.database import AsyncSessionLocal
            from sqlalchemy import select
            from app.models import Source
            
            async with AsyncSessionLocal() as db:
                query = select(Source).where(
                    Source.is_active == True,
                    Source.fetch_interval_minutes > 15,
                    Source.fetch_interval_minutes <= 30
                )
                result = await db.execute(query)
                sources = result.scalars().all()
            
            for source in sources:
                await ingestion_service.ingest_source(source.id)
                
        except Exception as e:
            logger.error(f"Error in medium-priority ingestion: {e}")
    
    async def ingest_low_priority(self):
        """Ingest from low-priority sources (research papers)."""
        logger.info("Running low-priority ingestion...")
        try:
            from app.database import AsyncSessionLocal
            from sqlalchemy import select
            from app.models import Source
            
            async with AsyncSessionLocal() as db:
                query = select(Source).where(
                    Source.is_active == True,
                    Source.fetch_interval_minutes > 30
                )
                result = await db.execute(query)
                sources = result.scalars().all()
            
            for source in sources:
                await ingestion_service.ingest_source(source.id)
                
        except Exception as e:
            logger.error(f"Error in low-priority ingestion: {e}")
    
    async def process_events(self):
        """Process unprocessed events with AI."""
        logger.info("Running AI processing...")
        try:
            result = await ai_processor.process_unprocessed(limit=50)
            logger.info(f"AI processing complete: {result}")
        except Exception as e:
            logger.error(f"Error in AI processing: {e}")
    
    async def recalculate_scores(self):
        """Recalculate importance scores."""
        logger.info("Running score recalculation...")
        try:
            result = await importance_scorer.recalculate_all_scores(limit=100)
            logger.info(f"Score recalculation complete: {result}")
        except Exception as e:
            logger.error(f"Error in score recalculation: {e}")
    
    async def daily_cleanup(self):
        """Perform daily cleanup tasks."""
        logger.info("Running daily cleanup...")
        try:
            # Could add cleanup tasks here
            # e.g., delete old logs, optimize database, etc.
            logger.info("Daily cleanup complete")
        except Exception as e:
            logger.error(f"Error in daily cleanup: {e}")
    
    def get_jobs(self):
        """Get list of scheduled jobs."""
        return [
            {
                "id": job.id,
                "name": job.name,
                "next_run": str(job.next_run_time) if job.next_run_time else None
            }
            for job in self.scheduler.get_jobs()
        ]


# Singleton instance
scheduler_service = SchedulerService()


def get_scheduler() -> SchedulerService:
    """Get scheduler service instance."""
    return scheduler_service
