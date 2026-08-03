# Scripts Directory

This directory contains utility scripts and helper batch files for the AI Signal project.

## Batch Files (Windows Helpers)

### Main Workflow Scripts
Located in **root directory** for easy access:
- `0-create-venv.bat` - Create Python virtual environment
- `1-setup.bat` - Install all dependencies
- `2-setup-database.bat` - Setup database schema
- `3-test-connection.bat` - Test database connection
- `4-run-backend.bat` - Start backend server
- `5-run-frontend.bat` - Start frontend dev server
- `6-run-both.bat` - Start both backend and frontend

### Utility Scripts (This Directory)
- `view-logs.bat` - Interactive log viewer with 7 options
- `check-supabase-pooler.bat` - Test Supabase pooler connection
- `7-update-rss-feeds.bat` - Show SQL to update RSS feed URLs
- `check-python-version.bat` - Check Python version compatibility

## Python Scripts

### Database Setup

#### run-database-setup.py
Initializes the database with tables and default data.

```bash
python scripts/run-database-setup.py
```

This script:
- Creates all database tables
- Adds default data sources
- Inserts default tags
- Sets up indexes and triggers

### Test Scripts (`test/` subdirectory)

#### validate-database-url.py
Validates the DATABASE_URL format in your `.env` file.

```bash
python scripts/test/validate-database-url.py
```

Checks:
- Protocol is correct (`postgresql+asyncpg://`)
- Using pooler hostname (for IPv4 networks)
- Port is correct (5432 or 6543)
- Project reference is valid
- Password is present

#### test-db-debug.py
Tests actual database connection and displays connection details.

```bash
python scripts/test/test-db-debug.py
```

Shows:
- DATABASE_URL from .env (with masked password)
- Connection test result
- Error details if connection fails

#### encode-password.py
URL-encodes passwords for use in DATABASE_URL.

```bash
python scripts/test/encode-password.py
```

Useful when your password contains special characters like `@`, `:`, `/`, etc.

## Batch File Usage

### View Logs
```bash
scripts\view-logs.bat
```

Interactive menu with options:
1. View all logs (last 50 lines)
2. View error logs only
3. View all logs (full file)
4. View error logs (full file)
5. Follow logs in real-time
6. Clear all logs
7. Exit

### Check Supabase Connection
```bash
scripts\check-supabase-pooler.bat
```

Tests connection to Supabase pooler (IPv4 compatible).

### Update RSS Feeds
```bash
scripts\7-update-rss-feeds.bat
```

Displays SQL to copy into Supabase SQL Editor for updating source RSS feed URLs.

### Check Python Version
```bash
scripts\check-python-version.bat
```

Checks if Python version is compatible (3.11 or 3.12 recommended).

## Requirements

Scripts use the same dependencies as the backend. Ensure you have:
- Python 3.11 or 3.12
- Dependencies installed: `pip install -r backend/requirements.txt`
- `.env` file configured with DATABASE_URL

## Adding New Scripts

When adding new utility scripts:
1. Place batch files in `scripts/` directory
2. Place Python scripts in `scripts/` or `scripts/test/`
3. Update this README with description
4. Keep main workflow scripts (0-6) in root for easy access

## See Also

- [Setup Guide](../docs/SETUP-GUIDE.md) - Complete setup instructions
- [Database Documentation](../database/) - SQL schemas
- [Troubleshooting](../docs/SETUP-GUIDE.md#troubleshooting) - Common issues


## Data Processing Scripts

### reprocess-events.bat / reprocess-events.py
**NEW** - Reprocess all existing events to add categories, tags, and recalculate scores.

```bash
# Windows
scripts\reprocess-events.bat

# Mac/Linux
python scripts/reprocess-events.py
```

**When to use:**
- After initial data ingestion when events don't have categories
- When you see "No trending topics yet" despite having events
- When category counts don't add up to total events (e.g., 97 total but categories only show 48)
- After updating the AI processor logic

**What it does:**
- Analyzes all events in the database
- Assigns categories (Research, Product, Funding, News, Tools)
- Extracts and assigns tags from event content
- Recalculates importance scores
- Updates sentiment scores

**Example output:**
```
Found 97 events to process
✓ Processed: Bridging the operational AI gap... (Category: announcement, Score: 39.2)
✓ Processed: The Download: Earth's rumblings... (Category: announcement, Score: 37.5)
...
Processing complete!
Processed: 97
Failed: 0
```

---

## Common Issues & Solutions

### Issue: "No trending topics yet"
**Cause:** Events exist but don't have tags assigned.
**Solution:** Run `reprocess-events.bat` to extract tags from existing events.

### Issue: Category counts don't add up to total
**Cause:** Many events are uncategorized (no category assigned during ingestion).
**Solution:** Run `reprocess-events.bat` to categorize all events.

### Issue: All scores are 0 or very low
**Cause:** Scoring algorithm not applied or needs recalculation.
**Solution:** Run `reprocess-events.bat` to recalculate importance scores.

---

## First Time Setup Order

For new installations, run scripts in this order:

1. **Root folder:** `1-setup.bat` - Install dependencies
2. **Root folder:** `2-setup-database.bat` - Setup database
3. **Root folder:** `3-test-connection.bat` - Test connection
4. **Scripts folder:** `7-update-rss-feeds.bat` - Add RSS feed URLs (optional)
5. **Root folder:** `6-run-both.bat` - Start application
6. **Trigger ingestion** via API (`POST /jobs/trigger`) or wait for scheduled run
7. **Scripts folder:** `reprocess-events.bat` - Process events to add categories/tags

---
