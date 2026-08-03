# AI Signal - Live AI Radar

> Real-time intelligence platform for tracking AI developments with intelligent scoring and neural graph visualization.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/)
[![Next.js 14](https://img.shields.io/badge/next.js-14-black)](https://nextjs.org/)

## Overview

AI Signal aggregates, processes, and visualizes AI developments from research papers, company blogs, news sites, and social media. It uses AI to automatically categorize, score, and connect related events in real-time.

## Key Features

- **Live Radar**: Real-time visualization of high-priority AI developments
- **Smart Scoring**: AI-powered importance scoring (0-100)
- **Auto-Categorization**: Events classified by type (Research, Product, Funding, etc.)
- **Neural Graph**: Interactive visualization showing event relationships
- **Advanced Filtering**: Search, filter by category, source, tags, and date range
- **AI Processing**: Automatic summarization, tag extraction, and sentiment analysis

## Quick Start

### Prerequisites
- Python 3.11 or 3.12 (NOT 3.13)
- Node.js 18+
- Supabase account (or local PostgreSQL)

### Installation

**Windows Users**: Use the provided batch files
```bash
1-setup.bat              # Install dependencies
2-setup-database.bat     # Setup database
3-test-connection.bat    # Test connection
7-update-rss-feeds.bat   # Update RSS feed URLs (one-time)
6-run-both.bat          # Start application
```

**Mac/Linux Users**:
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install

# Configure .env (copy from .env.example)
cp .env.example .env
# Edit .env with your database credentials

# Setup database
python scripts/run-database-setup.py

# Start backend
cd backend
uvicorn app.main:app --reload

# Start frontend (new terminal)
cd frontend
npm run dev
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Documentation

- **[RAG Documentation](docs/RAG.md)** - Comprehensive documentation for AI assistants and vector databases
- **[Documentation Index](docs/README.md)** - All documentation files
- **[Scripts Guide](scripts/README.md)** - Utility scripts and batch files

## Project Structure

```
ai-signal/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py      # Application entry point
│   │   ├── config.py    # Configuration management
│   │   ├── database.py  # Database connection
│   │   ├── models.py    # SQLAlchemy models
│   │   ├── schemas.py   # Pydantic schemas
│   │   ├── routers/     # API endpoints
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utilities
│   └── requirements.txt
├── frontend/            # Next.js frontend
│   ├── src/
│   │   ├── app/        # Next.js app router
│   │   ├── components/ # React components
│   │   └── lib/        # Utilities
│   └── package.json
├── database/           # SQL schemas
├── docs/              # Documentation
├── scripts/           # Utility scripts
│   └── test/         # Test scripts
└── docker/           # Docker configuration
```

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM with async support
- **PostgreSQL** - Database (via Supabase)
- **APScheduler** - Background job scheduling
- **OpenAI/Anthropic** - AI processing

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **D3.js** - Neural graph visualization
- **Recharts** - Analytics charts

## Configuration

All configuration is managed through environment variables in `.env`:

```env
# Database (Required)
DATABASE_URL=postgresql+asyncpg://user:password@host:port/database

# AI Processing (Optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...

# CORS (Required for production)
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
```

See `.env.example` for all available options.

## API Endpoints

### Sources
- `GET /sources` - List all data sources
- `POST /sources` - Add new source
- `PUT /sources/{id}` - Update source
- `DELETE /sources/{id}` - Delete source

### Events
- `GET /events` - List events (with filtering)
- `GET /events/{id}` - Get event details
- `GET /events/trending` - Get trending events
- `GET /events/stats` - Get statistics

### Jobs
- `GET /jobs` - List scheduled jobs
- `POST /jobs/trigger` - Manually trigger ingestion

### Health
- `GET /health` - Health check

Full API documentation: http://localhost:8000/docs

## Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Viewing Logs

Logs are written to the `logs/` directory:

```bash
# Interactive log viewer (Windows)
view-logs.bat

# View logs
type logs\ai-signal.log

# View errors only
type logs\ai-signal-errors.log
```

See [LOGGING-SETUP.md](LOGGING-SETUP.md) for details.

### Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Adding Data Sources
1. Go to http://localhost:8000/docs
2. Use POST `/sources` endpoint
3. Provide: name, type, url, reliability_score

## Deployment

### Backend (Render)
1. Connect GitHub repository
2. Set build command: `pip install -r backend/requirements.txt`
3. Set start command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables

### Frontend (Vercel)
1. Import GitHub repository
2. Set root directory: `frontend`
3. Add `NEXT_PUBLIC_API_URL` environment variable
4. Deploy

### Docker
```bash
cd docker
docker-compose up -d
```

## Troubleshooting

### Database Connection Issues
- **IPv4/IPv6 Error**: Enable Supabase Session Pooler
- **Password Failed**: Reset password in Supabase dashboard
- **Connection Timeout**: Check firewall settings

Run diagnostics:
```bash
python scripts/test/validate-database-url.py
python scripts/test/test-db-debug.py
```

### Python Version Issues
- Use Python 3.11 or 3.12 (NOT 3.13)
- Check: `python --version`

See [Setup Guide](docs/SETUP-GUIDE.md) for detailed troubleshooting.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: See `docs/` directory
- **Issues**: Open a GitHub issue
- **Email**: [your-email]

---

Built with ❤️ for the AI community
