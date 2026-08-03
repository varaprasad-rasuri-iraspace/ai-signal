"""FastAPI application entry point."""
import asyncio
import logging
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.database import init_db
from app.routers import events, sources, feed
from app.services.scheduler import scheduler_service

# Create logs directory
logs_dir = Path("../logs")
logs_dir.mkdir(exist_ok=True)

# Configure logging with fixed filenames (overwrite on each run)
log_filename = logs_dir / "ai-signal.log"
error_log_filename = logs_dir / "ai-signal-errors.log"

# Create formatters
detailed_formatter = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
simple_formatter = logging.Formatter(
    "%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%H:%M:%S"
)

# File handler (detailed logs - all levels) - mode 'w' to overwrite
file_handler = logging.FileHandler(log_filename, mode='w', encoding='utf-8')
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(detailed_formatter)

# Error file handler (errors and warnings only) - mode 'w' to overwrite
error_handler = logging.FileHandler(error_log_filename, mode='w', encoding='utf-8')
error_handler.setLevel(logging.WARNING)
error_handler.setFormatter(detailed_formatter)

# Console handler (simpler logs, INFO level only)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(simple_formatter)

# Configure root logger
logging.basicConfig(
    level=logging.DEBUG,
    handlers=[file_handler, error_handler, console_handler]
)

# Completely silence SQLAlchemy and other verbose loggers in console
logging.getLogger('sqlalchemy.engine').setLevel(logging.ERROR)
logging.getLogger('sqlalchemy.pool').setLevel(logging.ERROR)
logging.getLogger('sqlalchemy.dialects').setLevel(logging.ERROR)
logging.getLogger('sqlalchemy.orm').setLevel(logging.ERROR)

# Add filter to console handler to exclude SQLAlchemy
class NoSQLAlchemyFilter(logging.Filter):
    def filter(self, record):
        return not record.name.startswith('sqlalchemy')

console_handler.addFilter(NoSQLAlchemyFilter())

logger = logging.getLogger(__name__)
logger.info(f"Logging to: {log_filename}")
logger.info(f"Error logging to: {error_log_filename}")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting AI Signal API...")
    
    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.warning(f"Database initialization skipped: {e}")
    
    # Start scheduler
    try:
        await scheduler_service.start()
        logger.info("Scheduler started")
        logger.info("Data ingestion will run on schedule or can be triggered manually via /jobs/trigger")
    except Exception as e:
        logger.warning(f"Scheduler start skipped: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Signal API...")
    await scheduler_service.stop()
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="AI Signal API",
    description="Live AI Radar System - Real-time AI intelligence platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Add exception handler for logging
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Log all unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An error occurred"
        }
    )


# Include routers
app.include_router(feed.router)
app.include_router(events.router)
app.include_router(sources.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "AI Signal API",
        "version": "1.0.0",
        "description": "Live AI Radar System - Real-time AI intelligence platform",
        "docs": "/docs",
        "endpoints": {
            "feed": "/feed",
            "events": "/events",
            "sources": "/sources"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    from app.database import engine
    db_status = "unknown"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "db_status": db_status,
        "scheduler": "running" if scheduler_service.is_running else "stopped"
    }


@app.get("/jobs")
async def get_jobs():
    """Get scheduled jobs."""
    return {"jobs": scheduler_service.get_jobs()}


@app.post("/jobs/trigger")
async def trigger_ingestion():
    """Manually trigger data ingestion from all sources."""
    logger.info("Manual ingestion triggered via API - fetching from ALL sources")
    try:
        # Trigger ingestion from ALL active sources
        from app.services.ingestion import ingestion_service
        results = await ingestion_service.ingest_all_sources()
        
        total_fetched = sum(r.get("items_fetched", 0) for r in results)
        total_added = sum(r.get("items_added", 0) for r in results)
        
        logger.info(f"Ingestion complete: {total_fetched} fetched, {total_added} added from {len(results)} sources")
        
        return {
            "status": "success",
            "message": "Ingestion triggered successfully",
            "sources_processed": len(results),
            "items_fetched": total_fetched,
            "items_added": total_added,
            "note": "Check /feed endpoint for new events"
        }
    except Exception as e:
        logger.error(f"Error triggering ingestion: {e}", exc_info=True)
        return {
            "status": "error",
            "message": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
