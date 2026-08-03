# Application Logs

This directory contains application logs for the AI Signal backend.

## Log Files

### Fixed Filenames (Overwritten on Each Run)
- **`ai-signal.log`** - All application logs (DEBUG, INFO, WARNING, ERROR)
- **`ai-signal-errors.log`** - Only WARNING and ERROR level logs

These files are overwritten each time the backend starts, keeping only the current session's logs.

## Log Levels

- **DEBUG**: Detailed information for debugging
- **INFO**: General informational messages
- **WARNING**: Warning messages (potential issues)
- **ERROR**: Error messages (actual problems)

## Viewing Logs

### View log files:
```bash
# Windows
type logs\ai-signal.log
type logs\ai-signal-errors.log

# Mac/Linux
cat logs/ai-signal.log
cat logs/ai-signal-errors.log
```

### Tail logs (follow in real-time):
```bash
# Windows PowerShell
Get-Content logs\ai-signal.log -Wait -Tail 50

# Mac/Linux
tail -f logs/ai-signal.log
```

## Log Format

```
YYYY-MM-DD HH:MM:SS - module.name - LEVEL - message
```

Example:
```
2026-03-05 08:10:23 - app.main - INFO - Starting AI Signal API...
2026-03-05 08:10:24 - app.database - INFO - Database initialized
2026-03-05 08:10:25 - app.services.scheduler - INFO - Scheduler started
```

## Notes

- Logs are overwritten on each backend restart
- Only current session logs are kept
- For production, consider date-based rotation
- Logs are gitignored and won't be committed to version control
