"""Validate DATABASE_URL format for Supabase pooler connection."""
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Get DATABASE_URL
db_url = os.getenv("DATABASE_URL", "")

print("=" * 70)
print("DATABASE_URL VALIDATION")
print("=" * 70)

if not db_url:
    print("\n❌ ERROR: DATABASE_URL not found in .env file")
    print("\nPlease add DATABASE_URL to your .env file")
    exit(1)

print(f"\nCurrent DATABASE_URL:")
print(db_url)
print("\n" + "=" * 70)

# Validation checks
errors = []
warnings = []
success = []

# Check 1: Protocol
if db_url.startswith("postgresql+asyncpg://"):
    success.append("✓ Protocol is correct (postgresql+asyncpg://)")
elif db_url.startswith("postgresql://"):
    errors.append("✗ Protocol should be 'postgresql+asyncpg://' not 'postgresql://'")
else:
    errors.append("✗ Protocol is invalid (should start with postgresql+asyncpg://)")

# Check 2: Pooler hostname
if "pooler.supabase.com" in db_url:
    success.append("✓ Using pooler hostname (pooler.supabase.com)")
elif ".supabase.co" in db_url and "pooler" not in db_url:
    errors.append("✗ Using direct connection (db.[PROJECT_REF].supabase.co)")
    errors.append("  You MUST use pooler URL for IPv4 connectivity")
    errors.append("  Enable Session Pooler in Supabase dashboard")
elif ".supabase.co" in db_url or ".supabase.com" in db_url:
    warnings.append("⚠ Hostname looks like Supabase but not pooler")
else:
    warnings.append("⚠ Hostname doesn't look like Supabase")

# Check 3: Port
if ":6543/" in db_url or ":5432/" in db_url:
    if ":6543/" in db_url:
        success.append("✓ Port is 6543 (transaction pooler)")
    else:
        success.append("✓ Port is 5432 (session pooler or direct)")
        if "pooler.supabase.com" in db_url:
            success.append("  (Session pooler can use port 5432)")
else:
    warnings.append("⚠ Port not found or unusual")

# Check 4: Project reference
if "postgres." in db_url and "@" in db_url:
    # Extract project ref
    try:
        user_part = db_url.split("@")[0]
        if "postgres." in user_part:
            project_ref = user_part.split("postgres.")[1].split(":")[0]
            success.append(f"✓ Project reference found (postgres.{project_ref})")
    except:
        warnings.append("⚠ Could not parse project reference")
else:
    warnings.append("⚠ Project reference format unclear")

# Check 5: Password
if "@" in db_url:
    parts = db_url.split("@")[0]
    if ":" in parts:
        password = parts.split(":")[-1]
        if len(password) > 0:
            success.append(f"✓ Password present ({len(password)} characters)")
            if password == "[YOUR-PASSWORD]" or password == "password":
                errors.append("✗ Password is placeholder, not actual password")
        else:
            errors.append("✗ Password is empty")
    else:
        errors.append("✗ Password not found in URL")
else:
    errors.append("✗ URL format is invalid (no @ symbol)")

# Check 6: Database name
if db_url.endswith("/postgres"):
    success.append("✓ Database name is correct (postgres)")
else:
    warnings.append("⚠ Database name might be wrong (should end with /postgres)")

# Print results
print("\nVALIDATION RESULTS:")
print("=" * 70)

if success:
    print("\n✓ PASSED CHECKS:")
    for msg in success:
        print(f"  {msg}")

if warnings:
    print("\n⚠ WARNINGS:")
    for msg in warnings:
        print(f"  {msg}")

if errors:
    print("\n✗ ERRORS:")
    for msg in errors:
        print(f"  {msg}")

print("\n" + "=" * 70)

if errors:
    print("\n❌ VALIDATION FAILED")
    print("\nYour DATABASE_URL has errors that will prevent connection.")
    print("\nCORRECT FORMAT:")
    print("postgresql+asyncpg://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres")
    print("\nReplace PROJECT_REF, YOUR_PASSWORD, and REGION with your actual values")
    print("\nRun: check-supabase-pooler.bat for help")
    exit(1)
elif warnings:
    print("\n⚠ VALIDATION PASSED WITH WARNINGS")
    print("\nYour DATABASE_URL might work, but please review the warnings above.")
    print("\nTo test connection, run: 3-test-connection.bat")
    exit(0)
else:
    print("\n✅ VALIDATION PASSED")
    print("\nYour DATABASE_URL format looks correct!")
    print("\nTo test actual connection, run: 3-test-connection.bat")
    exit(0)
