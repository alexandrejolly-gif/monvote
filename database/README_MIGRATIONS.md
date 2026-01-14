# Database Migrations

This directory contains SQL migration files for the MonVote database.

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project: `ihdrzffeajwfzfvuugdu`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of the migration file (e.g., `migration_001_add_maire_sortant.sql`)
6. Paste into the query editor
7. Click **Run** or press `Ctrl+Enter`
8. Verify the migration was successful

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push --file database/migration_001_add_maire_sortant.sql
```

## Migration Files

### migration_001_add_maire_sortant.sql (REQUIRED)
**Status**: ⚠️ **NOT YET RUN** - MUST BE EXECUTED BEFORE TESTING NEW FEATURES

**Description**: Adds support for incumbent mayor identification and candidate proposals

**Changes**:
- Adds `maire_sortant` BOOLEAN column to `candidats` table (default: FALSE)
- Adds `propositions` JSONB column to `candidats` table (default: empty array)
- Creates index on `maire_sortant` for faster queries
- Adds column comments for documentation

**Required For**:
- Phase 2: Mayor identification with 🏛️ badge
- Phase 3: Candidate proposals expandable section

**How to Run**:
1. Open Supabase Dashboard SQL Editor
2. Copy the entire contents of `migration_001_add_maire_sortant.sql`
3. Paste and run the query
4. Verify with: `SELECT * FROM candidats LIMIT 1;` (should show new columns)

**Rollback** (if needed):
```sql
ALTER TABLE candidats DROP COLUMN IF EXISTS maire_sortant;
ALTER TABLE candidats DROP COLUMN IF EXISTS propositions;
DROP INDEX IF EXISTS idx_candidats_maire_sortant;
```

## Verification

After running the migration, verify it worked:

```sql
-- Check if columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'candidats'
  AND column_name IN ('maire_sortant', 'propositions');

-- Should return 2 rows:
-- maire_sortant | boolean | false
-- propositions  | jsonb   | '[]'::jsonb
```

## Important Notes

- ⚠️ **MUST RUN** migration_001 before testing the new features (Phases 2, 3, 5)
- Migrations are idempotent (safe to run multiple times due to `IF NOT EXISTS`)
- Always backup your database before running migrations in production
- Test migrations in a staging environment first if possible

## Current Status

- [ ] migration_001_add_maire_sortant.sql - **PENDING** (not yet run)

## Next Steps

After running migration_001:
1. Clear all cached candidates from the database (optional, to test fresh search):
   ```sql
   DELETE FROM candidats;
   ```
2. Test a commune to verify:
   - Mayor search is working (check console logs for "🏛️ Searching for current mayor...")
   - Mayor badge appears in results
   - Compact card design is displayed
   - Propositions section appears when data is available
