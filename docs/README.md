# AI Signal Documentation

Complete documentation for the AI Signal project.

## Getting Started

- **[Setup Guide](SETUP-GUIDE.md)** - Complete installation and configuration
- **[Quick Start](../QUICK-START.md)** - Get started in 5 minutes
- **[Windows Setup](../README-WINDOWS.md)** - Windows-specific instructions

## Recent Features

- **[Auto-Ingestion Complete](AUTO-INGESTION-COMPLETE.md)** - Manual trigger buttons + loading states
- **[UI Improvements Summary](UI-IMPROVEMENTS-SUMMARY.md)** - Visual guide to new features
- **[Logging Setup](LOGGING-SETUP.md)** - File-based logging configuration

## Troubleshooting

- **[Database Connection Issues](DATABASE-CONNECTION-SUMMARY.md)** - Fix database connectivity problems
- **[IPv4/IPv6 Issues](SUPABASE-IPV4-FIX.md)** - Supabase Session Pooler setup
- **[Python Version Issues](TROUBLESHOOTING-PYTHON313.md)** - Python 3.13 compatibility

## Deployment

- **[Backend Deployment](BACKEND_DEPLOYMENT.md)** - Deploy backend to Render
- **[Render Deployment](RENDER_DEPLOY.md)** - Detailed Render setup
- **[Vercel Deployment](VERCEL_SETUP.md)** - Deploy frontend to Vercel

## Database

- **[Supabase Setup](SUPABASE_SETUP.md)** - Setting up Supabase database
- **[Database Schema](../database/)** - SQL schemas and migrations

## Project Information

- **[Project Structure](PROJECT_STRUCTURE.md)** - Codebase organization
- **[Project Organization](PROJECT-ORGANIZATION.md)** - File organization and directory structure
- **[Walkthrough](WALKTHROUGH.md)** - Feature walkthrough

## Security

- **[Security Cleanup](SECURITY-CLEANUP.md)** - Removing credentials from code
- **[Final Security Report](FINAL-SECURITY-REPORT.md)** - Security audit results

## Quick Reference

### Main Batch Files (Root Directory)
- `1-setup.bat` - Install dependencies
- `2-setup-database.bat` - Database setup helper
- `3-test-connection.bat` - Test database connection
- `4-run-backend.bat` - Start backend
- `5-run-frontend.bat` - Start frontend
- `6-run-both.bat` - Start both servers

### Utility Scripts (scripts/ directory)
- `scripts/view-logs.bat` - Interactive log viewer
- `scripts/7-update-rss-feeds.bat` - Update RSS feed URLs
- `scripts/run-database-setup.py` - Initialize database
- `scripts/test/validate-database-url.py` - Validate DATABASE_URL
- `scripts/test/test-db-debug.py` - Debug database connection

See [Scripts Guide](../scripts/README.md) for details.

### Environment Variables
See `.env.example` for all configuration options.

### API Documentation
When running: http://localhost:8000/docs

## File Organization

- **[Project Organization](PROJECT-ORGANIZATION.md)** - Directory structure and file locations

```
ai-signal/
├── backend/           # FastAPI backend
├── frontend/          # Next.js frontend  
├── database/          # SQL schemas
├── docs/              # All documentation (you are here)
├── scripts/           # Utility scripts
├── logs/              # Application logs
└── *.bat              # Main workflow batch files (0-6)
```

---

**Need Help?** Start with [Setup Guide](SETUP-GUIDE.md) or the main [README](../README.md)
