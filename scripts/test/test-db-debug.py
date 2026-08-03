"""Debug database connection."""
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Get DATABASE_URL
db_url = os.getenv("DATABASE_URL")

print("=" * 60)
print("Database Connection Debug")
print("=" * 60)
print(f"\nDATABASE_URL from .env:")
print(db_url)
print("\n" + "=" * 60)

# Try to parse it
if db_url:
    # Hide password for security
    if "@" in db_url:
        parts = db_url.split("@")
        before_at = parts[0]
        after_at = parts[1]
        
        if ":" in before_at:
            protocol_user = before_at.rsplit(":", 1)[0]
            password = before_at.rsplit(":", 1)[1]
            
            print(f"\nProtocol + User: {protocol_user}")
            print(f"Password length: {len(password)} characters")
            print(f"Password (masked): {'*' * len(password)}")
            print(f"Host + DB: {after_at}")
            
print("\n" + "=" * 60)
print("\nNow testing actual connection...")
print("=" * 60)

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test():
    try:
        engine = create_async_engine(db_url, echo=False)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("\n✓ Database connection successful!")
            print("✓ Database is responding correctly")
    except Exception as e:
        print(f"\n✗ Database connection failed: {e}")
        print(f"\nError type: {type(e).__name__}")

asyncio.run(test())
