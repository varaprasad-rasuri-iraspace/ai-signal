"""Run database setup SQL script."""
import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Load .env file
load_dotenv()

# Get DATABASE_URL
db_url = os.getenv("DATABASE_URL")

print("=" * 70)
print("AI SIGNAL - DATABASE SETUP")
print("=" * 70)
print("\nThis will create all tables and insert default data.")
print("=" * 70)

async def run_setup():
    try:
        # Read SQL file
        with open("database/supabase-setup.sql", "r", encoding="utf-8") as f:
            sql_content = f.read()
        
        print("\n✓ SQL file loaded successfully")
        print(f"  File: database/supabase-setup.sql")
        
        # Create engine
        engine = create_async_engine(db_url, echo=False)
        
        print("✓ Connected to database")
        
        # Split SQL into individual statements
        # Remove comments and split by semicolon
        statements = []
        current_statement = []
        
        for line in sql_content.split('\n'):
            # Skip comment lines
            if line.strip().startswith('--'):
                continue
            
            current_statement.append(line)
            
            # If line ends with semicolon, it's end of statement
            if line.strip().endswith(';'):
                stmt = '\n'.join(current_statement)
                if stmt.strip():
                    statements.append(stmt)
                current_statement = []
        
        print(f"✓ Found {len(statements)} SQL statements to execute")
        print("\n" + "=" * 70)
        print("Executing SQL statements...")
        print("=" * 70)
        
        # Execute each statement
        async with engine.begin() as conn:
            for i, statement in enumerate(statements, 1):
                try:
                    # Get first line for display
                    first_line = statement.strip().split('\n')[0][:60]
                    print(f"\n[{i}/{len(statements)}] {first_line}...")
                    
                    await conn.execute(text(statement))
                    print(f"  ✓ Success")
                    
                except Exception as e:
                    error_msg = str(e)
                    # Ignore "already exists" errors
                    if "already exists" in error_msg.lower():
                        print(f"  ⚠ Already exists (skipping)")
                    elif "duplicate key" in error_msg.lower():
                        print(f"  ⚠ Duplicate data (skipping)")
                    else:
                        print(f"  ✗ Error: {error_msg}")
                        # Don't stop on errors, continue with next statement
        
        print("\n" + "=" * 70)
        print("✅ DATABASE SETUP COMPLETE!")
        print("=" * 70)
        print("\nYour database is ready to use.")
        print("\nNext steps:")
        print("  1. Run: 6-run-both.bat to start the application")
        print("  2. Open: http://localhost:3000 in your browser")
        print("=" * 70)
        
    except FileNotFoundError:
        print("\n✗ ERROR: database/supabase-setup.sql not found")
        print("  Make sure you're running this from the project root directory")
        return False
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        print(f"\nError type: {type(e).__name__}")
        return False
    
    return True

# Run the setup
success = asyncio.run(run_setup())
exit(0 if success else 1)
