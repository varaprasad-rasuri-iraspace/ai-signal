# AI Signal - RAG Documentation

> Retrieval-Augmented Generation documentation for AI Signal - Live AI Radar System

---

## 1. Overview

### Product Description
**AI Signal** is a real-time intelligence platform for tracking artificial intelligence developments. It aggregates, processes, and visualizes AI news from research papers, company blogs, news sites, and social media using AI-powered categorization, scoring, and relationship mapping.

### Core Idea
Transform scattered AI news sources into a unified, scored, and connected knowledge base with real-time visualization of AI developments and their relationships.

### Category
- **Type**: Real-time AI news aggregation and intelligence platform
- **Industry**: AI/ML News and Analytics
- **Target**: AI researchers, developers, investors, and enthusiasts

---

## 2. High-Level Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Live      │  │   Neural    │  │     Timeline/Feed       │ │
│  │   Radar     │  │   Graph     │  │     with Filters         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (FastAPI)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Feed      │  │   Events    │  │     Sources              │ │
│  │   Router    │  │   Router    │  │     Router               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Ingestion    │  │ AI          │  │     Scheduler           │ │
│  │ Service      │  │ Processor   │  │     Service             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL/Supabase)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Events     │  │   Sources    │  │     Tags                │ │
│  │   Table       │  │   Table      │  │     Table               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Ingestion Phase**
   - Scheduler triggers periodic data fetching from configured sources
   - RSS feeds are parsed using `feedparser` library
   - HTML pages scraped with `BeautifulSoup` (for non-RSS sources)
   - New events stored in database with raw payload

2. **AI Processing Phase**
   - Events categorized using keyword-based classification
   - Tags extracted based on brand/technology/application detection
   - Sentiment analysis performed using word matching
   - Importance score calculated using multi-factor algorithm

3. **Storage Phase**
   - Events stored with all metadata in PostgreSQL
   - Event relationships created for connected items
   - Ingestion logs maintained for debugging

4. **Retrieval Phase**
   - API endpoints serve filtered, paginated event data
   - Graph data constructed for visualization
   - Statistics aggregated on-demand

---

## 3. Core Features

### 3.1 Live Radar
- Real-time visualization of high-priority AI developments
- Displays signals with importance scores ≥50 as "high priority"
- Interactive click-to-jump functionality
- Animated radar sweep effect with concentric rings

**Implementation**: Frontend component `NeuralGraph.tsx` with canvas-based rendering

### 3.2 Smart Scoring (0-100)
Multi-factor importance scoring algorithm:
- **Source Reliability** (0-20 pts): Based on source type
  - Research papers: 20 pts
  - Blogs: 15 pts
  - News: 10 pts
  - GitHub: 8 pts
  - Social: 5 pts
- **Category Weight**: Multiplier applied based on category
  - Research: 1.5x
  - Funding: 1.3x
  - Product: 1.2x
- **Keyword Boosts**: Additional points for important terms
  - AGI, breakthrough: +10
  - GPT, LLM: +7
  - OpenAI, Anthropic: +8
- **Time Decay**: Events lose score over time
- **Sentiment**: Positive sentiment gets 1.1x multiplier

**Implementation**: `backend/app/services/scorer.py` - `ImportanceScorer` class

### 3.3 Auto-Categorization
Events automatically classified into categories:
- `research` - Academic papers, discoveries
- `product` - Product launches, releases
- `funding` - Investments, acquisitions
- `announcement` - Major announcements
- `tool` - New tools, libraries
- `partnership` - Collaborations
- `ethics` - AI safety, policy

**Implementation**: `backend/app/services/ai_processor.py` - `_classify_category()` method

### 3.4 Neural Graph Visualization
Interactive graph showing event relationships:
- Circular node layout with category-based coloring
- Zoom and pan controls
- Node click for details
- Edges represent relationships (related, cites, follows)

**Implementation**: `frontend/src/components/NeuralGraph.tsx` with HTML5 Canvas

### 3.5 Advanced Filtering
Multiple filter options:
- Category filter (Research, Product, Funding, etc.)
- Tag filter (LLM, GPT, Healthcare AI, etc.)
- Source filter
- Score range filter (min/max score)
- Date range filter (Today, 7 days, 15 days)
- Full-text search

### 3.6 AI Processing Pipeline
Automatic processing for each ingested event:
1. Summary generation (extractive or LLM-based)
2. Category classification (keyword-based)
3. Tag extraction (brand/technology/application detection)
4. Sentiment analysis (positive/negative word matching)
5. Importance scoring

**Implementation**: `backend/app/services/ai_processor.py`

---

## 4. API Documentation

### Base URL
- Development: `http://localhost:8000`
- Production: Configured via `NEXT_PUBLIC_API_URL` environment variable

### 4.1 Feed Endpoints

#### GET /feed
Main feed endpoint with filtering and pagination.

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Page number (1-based) |
| page_size | int | 20 | Items per page (max: 100) |
| category | string | null | Filter by category |
| tag_slug | string | null | Filter by tag slug |
| source_id | UUID | null | Filter by source ID |
| min_score | float | null | Minimum importance score |
| max_score | float | null | Maximum importance score |
| search | string | null | Full-text search |
| start_date | datetime | null | Start of date range (ISO 8601) |
| end_date | datetime | null | End of date range (ISO 8601) |
| sort_by | string | "published_at" | Sort field: "published_at" or "importance_score" |

**Request Example:**
```bash
GET /feed?page=1&page_size=25&category=research&min_score=50&sort_by=importance_score
```

**Response Schema:**
```json
{
  "events": [Event],
  "total": 1234,
  "page": 1,
  "page_size": 25,
  "has_next": true
}
```

**Event Schema:**
```json
{
  "id": "uuid",
  "title": "string",
  "summary": "string|null",
  "content": "string|null",
  "url": "string",
  "image_url": "string|null",
  "source_id": "uuid|null",
  "published_at": "datetime",
  "ingested_at": "datetime",
  "category": "string|null",
  "importance_score": 75.5,
  "sentiment_score": 0.3,
  "is_processed": true,
  "source": {Source},
  "tags": [{Tag}]
}
```

---

#### GET /feed/radar
Get live radar signals for visualization.

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | int | 20 | Max signals to return (max: 100) |
| days | int | 30 | Days to look back (max: 90) |

**Request Example:**
```bash
GET /feed/radar?limit=10&days=30
```

**Response Schema:**
```json
[{
  "id": "uuid",
  "title": "string",
  "category": "research",
  "importance_score": 82.5,
  "published_at": "2024-01-15T10:30:00Z",
  "source_name": "arXiv CS AI"
}]
```

---

#### GET /feed/stats
Get overall statistics with optional date filtering.

**Request Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| start_date | datetime | Start of filter range (ISO 8601) |
| end_date | datetime | End of filter range (ISO 8601) |

**Request Example:**
```bash
GET /feed/stats?start_date=2024-01-01T00:00:00Z&end_date=2024-01-15T23:59:59Z
```

**Response Schema:**
```json
{
  "total_events": 1234,
  "total_sources": 8,
  "total_tags": 45,
  "events_today": 15,
  "avg_importance_score": 42.5,
  "category_breakdown": {
    "research": 450,
    "product": 320,
    "funding": 200
  },
  "top_tags": [
    {"name": "Large Language Models", "slug": "large-language-models", "count": 89}
  ]
}
```

---

#### GET /feed/graph
Get event relationship graph data for visualization.

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | int | 30 | Days to look back (max: 90) |
| limit | int | 1000 | Max nodes (max: 5000) |
| min_score | float | 0 | Minimum importance score |

**Request Example:**
```bash
GET /feed/graph?days=30&limit=500&min_score=40
```

**Response Schema:**
```json
{
  "nodes": [{
    "id": "string",
    "title": "string",
    "url": "string",
    "category": "research",
    "importance_score": 85.0,
    "published_at": "2024-01-15T10:30:00Z",
    "source_name": "OpenAI Blog"
  }],
  "edges": [{
    "source": "uuid",
    "target": "uuid",
    "relationship_type": "related",
    "weight": 1.0
  }]
}
```

---

#### GET /feed/trending
Get trending tags based on recent event usage.

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | int | 10 | Max tags to return (max: 50) |

**Request Example:**
```bash
GET /feed/trending?limit=20
```

**Response Schema:**
```json
[{
  "id": "uuid",
  "name": "Large Language Models",
  "slug": "large-language-models",
  "category": "model"
}]
```

---

#### GET /feed/heatmap
Get heatmap data for impact intensity over time.

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | int | 30 | Days to look back (max: 365) |

**Request Example:**
```bash
GET /feed/heatmap?days=90
```

**Response Schema:**
```json
[{
  "date": "2024-01-15",
  "count": 25,
  "avg_score": 45.5
}]
```

---

#### GET /feed/latest
Get the latest events.

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | int | 10 | Max events (max: 50) |

---

#### GET /feed/top
Get top events by importance score.

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | int | 7 | Days to look back (max: 30) |
| limit | int | 10 | Max events (max: 50) |

---

#### GET /feed/related/{event_id}
Get related events for a specific event.

**Request Example:**
```bash
GET /feed/related/550e8400-e29b-41d4-a716-446655440000?limit=10
```

---

#### GET /feed/categories
Get all event categories with counts.

**Response Schema:**
```json
{
  "categories": [
    {"name": "research", "count": 450},
    {"name": "product", "count": 320}
  ]
}
```

---

### 4.2 Events Endpoints

#### GET /events
List events with basic filtering.

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Page number |
| page_size | int | 20 | Items per page (max: 100) |
| category | string | null | Filter by category |
| source_id | UUID | null | Filter by source ID |
| min_score | float | null | Minimum score |
| max_score | float | null | Maximum score |
| search | string | null | Search term |

---

#### GET /events/{event_id}
Get a single event by ID.

---

#### POST /events
Create a new event.

**Request Body:**
```json
{
  "title": "string (required)",
  "summary": "string",
  "content": "string",
  "url": "string (required, unique)",
  "image_url": "string",
  "source_id": "uuid",
  "published_at": "datetime (required)",
  "category": "string",
  "tag_ids": ["uuid"]
}
```

---

#### PATCH /events/{event_id}
Update an existing event.

---

#### DELETE /events/{event_id}
Delete an event.

---

#### GET /events/search
Search events by title or summary.

**Request Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query (min 2 chars) |
| page | int | Page number |
| page_size | int | Items per page |

---

#### POST /events/recalculate-scores
Recalculate importance scores for recent events.

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | int | 100 | Events to process (max: 1000) |

---

### 4.3 Sources Endpoints

#### GET /sources
List all data sources.

**Request Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| is_active | boolean | Filter by active status |
| source_type | string | Filter by type (research, news, blog, github, social) |

---

#### GET /sources/{source_id}
Get a single source by ID.

---

#### POST /sources
Create a new data source.

**Request Body:**
```json
{
  "name": "OpenAI Blog (required)",
  "type": "blog (required)",
  "url": "https://openai.com/blog (required, unique)",
  "reliability_score": 0.95,
  "fetch_interval_minutes": 30,
  "is_active": true
}
```

**Source Types:**
- `research` - Academic/research sites (arXiv, papers)
- `news` - News publications
- `blog` - Company blogs
- `github` - GitHub trending
- `social` - Social media (Hacker News)

---

#### PATCH /sources/{source_id}
Update a source.

---

#### DELETE /sources/{source_id}
Delete a source.

---

#### GET /sources/{source_id}/logs
Get ingestion logs for a source.

---

### 4.4 System Endpoints

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "db_status": "connected",
  "scheduler": "running"
}
```

---

#### GET /jobs
Get scheduled jobs status.

---

#### POST /jobs/trigger
Manually trigger data ingestion from all sources.

**Response:**
```json
{
  "status": "success",
  "message": "Ingestion triggered successfully",
  "sources_processed": 8,
  "items_fetched": 120,
  "items_added": 15
}
```

---

## 5. Database Schema

### Tables

#### sources
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Source name |
| type | VARCHAR(50) | NOT NULL | research, news, blog, github, social |
| url | VARCHAR(500) | NOT NULL, UNIQUE | RSS or HTML feed URL |
| reliability_score | DECIMAL(3,2) | DEFAULT 0.5 | Source reliability (0-1) |
| fetch_interval_minutes | INTEGER | DEFAULT 60 | How often to fetch |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_sources_type` on `type`
- `idx_sources_is_active` on `is_active`

---

#### events
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| title | VARCHAR(500) | NOT NULL | Event title |
| summary | TEXT | | Short summary |
| content | TEXT | | Full content |
| url | VARCHAR(500) | NOT NULL, UNIQUE | Source URL |
| image_url | VARCHAR(500) | | Thumbnail image |
| source_id | UUID | FOREIGN KEY | Reference to sources |
| published_at | TIMESTAMP | NOT NULL | Original publication date |
| ingested_at | TIMESTAMP | DEFAULT NOW() | When ingested |
| category | VARCHAR(50) | | research, product, funding, etc. |
| importance_score | DECIMAL(5,2) | DEFAULT 0.0 | AI-calculated score (0-100) |
| sentiment_score | DECIMAL(3,2) | | -1 to 1 sentiment |
| raw_payload | JSONB | | Original feed entry |
| is_processed | BOOLEAN | DEFAULT false | AI processing status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_events_published_at` on `published_at DESC`
- `idx_events_importance_score` on `importance_score DESC`
- `idx_events_category` on `category`
- `idx_events_source_id` on `source_id`
- `idx_events_is_processed` on `is_processed`
- `idx_events_title_gin` using GIN with `to_tsvector('english', title)`
- `idx_events_summary_gin` using GIN with `to_tsvector('english', summary)`

**Triggers:**
- Auto-update `updated_at` on row update

---

#### tags
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Display name |
| slug | VARCHAR(100) | NOT NULL, UNIQUE | URL-friendly name |
| category | VARCHAR(50) | | model, application, brand, business |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_tags_name` on `name`
- `idx_tags_slug` on `slug`

---

#### event_tags
Junction table for many-to-many event-tag relationship.

| Column | Type | Constraints |
|--------|------|-------------|
| event_id | UUID | FOREIGN KEY (CASCADE DELETE) |
| tag_id | UUID | FOREIGN KEY (CASCADE DELETE) |
| | | PRIMARY KEY (event_id, tag_id) |

---

#### event_relationships
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| source_event_id | UUID | FOREIGN KEY | Source event |
| target_event_id | UUID | FOREIGN KEY | Target event |
| relationship_type | VARCHAR(50) | | related, cites, follows, competitor, funding |
| weight | DECIMAL(3,2) | DEFAULT 1.0 | Relationship strength |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_event_relationships_source` on `source_event_id`
- `idx_event_relationships_target` on `target_event_id`

**Constraints:**
- UNIQUE on (source_event_id, target_event_id, relationship_type)

---

#### users
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User email |
| username | VARCHAR(100) | NOT NULL, UNIQUE | Username |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| role | VARCHAR(20) | DEFAULT 'user' | user, admin |
| is_premium | BOOLEAN | DEFAULT false | Premium status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

---

#### api_keys
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| user_id | UUID | FOREIGN KEY | Owner user |
| key_hash | VARCHAR(255) | NOT NULL, UNIQUE | Hashed API key |
| name | VARCHAR(100) | | Key name/description |
| rate_limit | INTEGER | DEFAULT 100 | Requests per minute |
| is_active | BOOLEAN | DEFAULT true | Active status |
| expires_at | TIMESTAMP | | Expiration date |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

---

#### ingestion_logs
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| source_id | UUID | FOREIGN KEY | Source ingested |
| status | VARCHAR(20) | | success, failed, partial |
| items_fetched | INTEGER | DEFAULT 0 | Items retrieved |
| items_added | INTEGER | DEFAULT 0 | New items stored |
| error_message | TEXT | | Error details |
| started_at | TIMESTAMP | NOT NULL | Start time |
| completed_at | TIMESTAMP | | Completion time |

---

## 6. Directory Structure

```
ai-signal/
├── backend/                    # FastAPI backend application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app entry point, lifespan management
│   │   ├── config.py           # Settings using pydantic-settings
│   │   ├── database.py         # Async SQLAlchemy setup, session management
│   │   ├── models.py           # SQLAlchemy ORM models
│   │   ├── schemas.py          # Pydantic validation schemas
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── feed.py         # Feed API endpoints (main feed, radar, stats)
│   │   │   ├── events.py       # Events CRUD endpoints
│   │   │   └── sources.py      # Sources CRUD endpoints
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ingestion.py     # RSS/HTML fetching and parsing
│   │   │   ├── ai_processor.py # Event categorization, tagging, sentiment
│   │   │   ├── scorer.py        # Importance scoring algorithm
│   │   │   └── scheduler.py     # APScheduler job management
│   │   └── utils/
│   │       └── __init__.py
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # Next.js frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout with providers
│   │   │   ├── page.tsx         # Main dashboard page
│   │   │   └── globals.css      # Tailwind CSS imports
│   │   ├── components/
│   │   │   ├── NeuralGraph.tsx  # Canvas-based graph visualization
│   │   │   ├── GraphVisualizations.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── LoadingProgressBar.tsx
│   │   │   ├── RefreshButton.tsx
│   │   │   └── providers.tsx    # React Query providers
│   │   ├── hooks/
│   │   │   └── useFeedWithPagination.ts
│   │   └── lib/
│   │       └── api.ts          # TypeScript API client
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── tsconfig.json
│
├── database/                    # SQL scripts and schemas
│   ├── schema.sql              # Complete database schema
│   ├── add-more-sources.sql    # Additional data sources
│   ├── remove-sources.sql
│   ├── cleanup-and-sources.sql
│   ├── trending-sources.sql
│   ├── update-rss-feeds.sql
│   ├── supabase-setup.sql     # Supabase-specific setup
│   └── remove-sources.sql
│
├── scripts/                    # Utility scripts
│   ├── run-database-setup.py   # Database initialization script
│   ├── check-scores-issue.py   # Score debugging utility
│   ├── reprocess-events.py     # Batch event reprocessing
│   └── test/                   # Test scripts
│
├── docs/                       # Documentation
│   ├── SETUP-GUIDE.md          # Installation guide
│   ├── BACKEND_DEPLOYMENT.md   # Deployment instructions
│   ├── API-SYNC-COMPLETE.md
│   └── ...                     # Various feature/improvement docs
│
├── docker/                     # Docker configuration
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
│
├── logs/                       # Application logs
│   ├── ai-signal.log          # All log levels
│   └── ai-signal-errors.log    # Errors and warnings only
│
├── .env.example               # Environment template
├── README.md                   # Main documentation
└── pyproject.toml             # Python project config
```

---

## 7. Key Implementation Patterns

### 7.1 API Proxy Pattern
Frontend proxies API calls through Next.js to backend:
```
Browser → Next.js → FastAPI → PostgreSQL
```

### 7.2 Input Validation/Sanitization
- **Backend**: Pydantic models validate all request data
- **Frontend**: TypeScript interfaces ensure type safety
- HTML content cleaned using regex patterns
- ArXiv metadata patterns removed from summaries

### 7.3 Rate Limiting
- Configurable via `api_rate_limit` setting (default: 100 requests)
- API keys table supports per-key rate limits

### 7.4 Caching Strategy
- React Query with configurable stale times
- Cache invalidation on data updates
- Refetch intervals for live data

### 7.5 Response Templating
- Pydantic schemas define consistent response formats
- All responses include proper HTTP status codes
- Error responses include detail messages

### 7.6 Async/Await Pattern
- All database operations use async SQLAlchemy
- HTTP client uses aiohttp for async requests
- Batch processing without blocking

### 7.7 Singleton Services
- `ingestion_service` - Single instance for all ingestion
- `importance_scorer` - Single scoring instance
- `ai_processor` - Single AI processing instance
- `scheduler_service` - Single scheduler instance

---

## 8. Target Users

### Primary Personas

1. **AI Researcher**
   - Needs: Real-time access to latest AI papers and research
   - Uses: Timeline view, category filters, search

2. **AI Developer**
   - Needs: Stay updated on tools, libraries, and product releases
   - Uses: Tool category filter, GitHub source, tag filters

3. **AI Investor**
   - Needs: Track funding, acquisitions, company announcements
   - Uses: Funding category, company filters, graph visualization

4. **AI Enthusiast**
   - Needs: General overview of AI landscape
   - Uses: Live Radar, trending topics, high-priority events

---

## 9. Use Cases

### 9.1 Real-Time Monitoring
- Monitor Live Radar for high-priority AI developments
- Set up filters for specific categories or tags
- Get notified of breaking news through visual indicators

### 9.2 Research Discovery
- Browse research papers from arXiv
- Filter by importance score to find significant papers
- Track related events through graph visualization

### 9.3 Competitive Intelligence
- Track announcements from competing companies
- Monitor funding rounds and acquisitions
- Analyze relationship graphs for market insights

### 9.4 Content Curation
- Filter events by source reliability
- Use importance scores to prioritize content
- Generate daily AI news digests

### 9.5 API Integration
- Access event data programmatically via REST API
- Build custom dashboards using API endpoints
- Integrate with existing tools and workflows

---

## 10. Limitations

### Current Gaps
- No authentication/authorization system implemented
- No user preferences or saved filters
- No email or push notifications
- No mobile app

### Missing Features
- No real-time WebSocket updates (polling only)
- No advanced search with boolean operators
- No event deduplication across sources
- No comment or annotation system

### Technical Constraints
- Python 3.13 not supported (use 3.11/3.12)
- PostgreSQL only (no MySQL/MongoDB support)
- Single-server ingestion (no distributed fetching)
- No CDN integration for images

---

## 11. Future Enhancements

### AI Integrations
- [ ] LLM-powered summarization (OpenAI/Anthropic)
- [ ] Semantic search using embeddings
- [ ] Automatic relationship detection using AI
- [ ] Personalized recommendations

### Scalability Improvements
- [ ] Redis caching layer
- [ ] Background job queue (Celery/RQ)
- [ ] Microservices architecture
- [ ] Multi-region deployment

### Feature Additions
- [ ] User authentication (OAuth, JWT)
- [ ] Custom alert rules
- [ ] Email digest subscriptions
- [ ] Browser extension
- [ ] Slack/Discord integrations
- [ ] Mobile app (React Native)

### Data Enrichment
- [ ] Twitter/social media integration
- [ ] Company information database
- [ ] Academic citation tracking
- [ ] Video/audio content processing

---

## 12. Security Features

### Authentication & Authorization
- User table with bcrypt password hashing
- Role-based access (user, admin)
- Future: JWT token authentication
- Future: OAuth integration

### Data Protection
- Environment variables for secrets
- No sensitive data in logs
- Input sanitization on all endpoints
- SQL injection prevention via ORM

### API Security
- CORS configuration for allowed origins
- Rate limiting per API key
- Input validation via Pydantic
- UUID-based resource identifiers

### Abuse Prevention
- Request timeout (30 seconds default)
- Batch size limits
- Duplicate URL detection
- Source reliability scoring

---

## 13. Error Handling

### Backend Patterns

1. **Global Exception Handler**
   ```python
   @app.exception_handler(Exception)
   async def global_exception_handler(request, exc):
       logger.error(f"Unhandled exception: {exc}")
       return {"error": "Internal server error"}
   ```

2. **HTTPException for 404/400**
   ```python
   if not event:
       raise HTTPException(status_code=404, detail="Event not found")
   ```

3. **Try-Catch with Logging**
   ```python
   try:
       result = await process()
   except Exception as e:
       logger.error(f"Error: {e}", exc_info=True)
       return {"status": "error"}
   ```

4. **Graceful Degradation**
   - Scheduler failures don't crash app
   - Missing AI keys don't break ingestion
   - Database errors return proper status

### Frontend Patterns

1. **Error Boundaries**
   - React Query error states
   - Loading states during fetches

2. **Toast Notifications**
   ```typescript
   showToast('Error message', 'error');
   ```

3. **Fallback UI**
   - Empty states for no data
   - Loading spinners during fetches

---

## 14. Dev & Deployment

### Local Setup

**Windows:**
```bash
# Use provided batch files
1-setup.bat              # Install dependencies
2-setup-database.bat     # Setup database
3-test-connection.bat    # Test connection
6-run-both.bat           # Start both servers
```

**Mac/Linux:**
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Environment Variables

**.env file:**
```env
# Database (Required)
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname

# AI Processing (Optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...

# CORS (Required for production)
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000

# App Settings
DEBUG=false
```

### Deployment Platforms

**Backend (Render):**
1. Connect GitHub repository
2. Set build: `pip install -r backend/requirements.txt`
3. Set start: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables

**Frontend (Vercel):**
1. Import GitHub repository
2. Set root directory: `frontend`
3. Add `NEXT_PUBLIC_API_URL` environment variable
4. Deploy

### Docker Deployment
```bash
cd docker
docker-compose up -d
```

### CI/CD
- GitHub Actions workflow (currently disabled)
- Automatic testing on pull requests
- Preview deployments for branches

---

## 15. Competitive Landscape

### Alternatives
- **Google Alerts**: Generic, no AI-specific filtering
- ** Hacker News**: Manual browsing, no scoring
- **AI Weekly**: Newsletter format, not real-time
- **The Batch (Andrew Ng)**: Curated, not comprehensive
- **arXiv-sanity**: Research-focused, no multi-source

### Differentiation
- **Real-time scoring**: Unique importance algorithm
- **Multi-source aggregation**: Unified view across sources
- **Interactive visualization**: Graph-based exploration
- **Customizable filters**: Granular control over content
- **Open source**: Self-hostable, extensible

---

## 16. Key Value Proposition

**AI Signal** transforms the fragmented landscape of AI news into a unified, intelligent platform where every development is automatically categorized, scored, and connected—giving researchers, developers, and investors a real-time command center for tracking the rapidly evolving AI ecosystem.

---

## Documentation
- [RAG Documentation](./docs/RAG.md)
