# Database Migrations

This document contains instructions for running database migrations on production.

## Current Schema Version

The current schema is defined in `db/schema.sql`. All tables and types are created from this file.

## Migrations Directory

See `db/migrations/` for all migration files.

## Running Migrations on Production

### Prerequisites
- Access to the production Postgres database
- The `psql` command-line tool installed locally
- The `DATABASE_URL` from Render dashboard (production database)

### Step 1: Get Database Connection Details

1. Navigate to the Render dashboard: https://dashboard.render.com/
2. Find the PostgreSQL database service
3. Copy the `External Database URL` (contains `DATABASE_URL`)

### Step 2: Run Migrations

Run migrations using the following command:

```bash
psql $DATABASE_URL -f db/migrations/001_add_profile_embedding.sql
```

For multiple migrations (if they exist), run in order:

```bash
psql $DATABASE_URL -f db/migrations/001_add_profile_embedding.sql
psql $DATABASE_URL -f db/migrations/002_next_migration.sql
# ... continue in order
```

### Step 3: Verify Migration

Connect to the database and verify the migration was applied:

```bash
psql $DATABASE_URL
```

Then in the psql prompt:

```sql
\dt                          -- List all tables
\d matches                   -- Describe the 'matches' table
SELECT * FROM event_participants LIMIT 1;  -- Verify profile_embedding column exists
```

## Current Migrations

### 001_add_profile_embedding.sql

**Purpose**: Adds pgvector extension and profile_embedding column

**What it does**:
- Creates pgvector extension for storing embeddings
- Adds `profile_embedding vector(1536)` column to `event_participants` table
- Enables semantic matching based on profile embeddings

**When to run**: When migrating from older databases that don't have pgvector

**Command**:
```bash
psql $DATABASE_URL -f db/migrations/001_add_profile_embedding.sql
```

**Verification**:
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'event_participants' AND column_name = 'profile_embedding';
```

Should return: `profile_embedding | vector`

## Initial Schema Creation

If setting up a fresh database from scratch, run:

```bash
psql $DATABASE_URL -f db/schema.sql
```

This creates all tables, types, and indexes defined in the schema.

## Rollback Procedures

Currently there are no automatic rollback migrations. To rollback:

1. **For 001_add_profile_embedding.sql**: 
   - Drop the column: `ALTER TABLE event_participants DROP COLUMN profile_embedding;`
   - Remove extension: `DROP EXTENSION IF EXISTS vector;`

2. **For full schema rollback**:
   - Drop all tables: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
   - Recreate from schema.sql: `psql $DATABASE_URL -f db/schema.sql`

## Testing Migrations Locally

Before running on production:

1. Create a local test database: `createdb test_dream_team`
2. Create schema: `psql test_dream_team -f db/schema.sql`
3. Run migration: `psql test_dream_team -f db/migrations/001_add_profile_embedding.sql`
4. Verify: `psql test_dream_team -c "\d event_participants"`

## Monitoring

After running migrations on production:

1. Monitor for any errors in the application logs
2. Verify all API endpoints work correctly
3. Check that new features using the migration work as expected

## Contact

For migration issues or questions, contact: abhadeshpande5@gmail.com
