"""Check for events with unusual scores."""
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Load environment
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

from app.database import AsyncSessionLocal
from app.models import Event
from sqlalchemy import select, func


async def check_scores():
    """Check score distribution."""
    async with AsyncSessionLocal() as db:
        # Count events with score 100
        result = await db.execute(
            select(func.count(Event.id)).where(Event.importance_score == 100)
        )
        score_100 = result.scalar()
        
        # Count events with score 0
        result = await db.execute(
            select(func.count(Event.id)).where(Event.importance_score == 0)
        )
        score_0 = result.scalar()
        
        # Get total events
        result = await db.execute(select(func.count(Event.id)))
        total = result.scalar()
        
        # Get events with score 100
        if score_100 > 0:
            result = await db.execute(
                select(Event.title, Event.importance_score, Event.category)
                .where(Event.importance_score == 100)
                .limit(10)
            )
            events_100 = result.all()
        else:
            events_100 = []
        
        print(f"\n{'='*60}")
        print(f"Score Distribution")
        print(f"{'='*60}")
        print(f"Total events: {total}")
        print(f"Events with score 100: {score_100}")
        print(f"Events with score 0: {score_0}")
        print(f"Events with normal scores: {total - score_100 - score_0}")
        
        if events_100:
            print(f"\n{'='*60}")
            print(f"Events with score 100:")
            print(f"{'='*60}")
            for title, score, category in events_100:
                print(f"- {title[:60]}... (Category: {category})")


if __name__ == "__main__":
    asyncio.run(check_scores())
