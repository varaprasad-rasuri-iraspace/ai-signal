"""Reprocess all events to add categories and tags."""
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

from app.database import AsyncSessionLocal
from app.models import Event, Source, Tag
from app.services.ai_processor import ai_processor
from app.services.scorer import importance_scorer
from sqlalchemy import select
from sqlalchemy.orm import selectinload


async def reprocess_all_events():
    """Reprocess all events to add categories, tags, and recalculate scores."""
    async with AsyncSessionLocal() as db:
        # Get all events
        query = select(Event).options(
            selectinload(Event.source),
            selectinload(Event.tags)
        )
        result = await db.execute(query)
        events = result.scalars().all()
        
        print(f"Found {len(events)} events to process")
        
        processed = 0
        failed = 0
        
        for event in events:
            try:
                # AI processing (category, tags, sentiment)
                processing_results = await ai_processor.process_event(event)
                event.category = processing_results["category"]
                event.sentiment_score = processing_results["sentiment"]
                event.is_processed = True
                
                # Add tags
                if processing_results["tags"]:
                    tag_slugs = processing_results["tags"]
                    tag_query = select(Tag).where(Tag.slug.in_(tag_slugs))
                    tag_result = await db.execute(tag_query)
                    tags = tag_result.scalars().all()
                    if tags:
                        event.tags = list(tags)
                
                # Recalculate importance score
                source = event.source if event.source_id else None
                score = await importance_scorer.calculate_score(event, source)
                event.importance_score = score
                
                processed += 1
                print(f"✓ Processed: {event.title[:60]}... (Category: {event.category}, Score: {score:.1f})")
                
            except Exception as e:
                failed += 1
                print(f"✗ Failed: {event.title[:60]}... - {e}")
        
        # Commit all changes
        await db.commit()
        
        print(f"\n{'='*60}")
        print(f"Processing complete!")
        print(f"Processed: {processed}")
        print(f"Failed: {failed}")
        print(f"{'='*60}")


if __name__ == "__main__":
    # Verify DATABASE_URL is set
    database_url = os.getenv("DATABASE_URL")
    if not database_url or database_url == "postgresql+asyncpg://user:password@localhost:5432/dbname":
        print("\n❌ ERROR: DATABASE_URL not found or using default value!")
        print("Please ensure .env file exists in project root with valid DATABASE_URL")
        print(f"Looking for .env at: {Path(__file__).parent.parent / '.env'}")
        sys.exit(1)
    
    print(f"✓ Using database: {database_url.split('@')[1].split('/')[0] if '@' in database_url else 'unknown'}")
    print("Reprocessing all events...")
    print("This will add categories, tags, and recalculate scores.\n")
    asyncio.run(reprocess_all_events())
