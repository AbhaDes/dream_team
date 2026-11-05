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
psql $DATABASE_URL -f db/migrations/002_participant_uniqueness_and_reports.sql
psql $DATABASE_URL -f db/migrations/003_email_verification.sql
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

## Deploy Runbook: email verification release

Do these in order:

1. **Migrate first.** With the backend still on the old version, run:
   ```bash
   psql $DATABASE_URL -v ON_ERROR_STOP=1 -f db/migrations/002_participant_uniqueness_and_reports.sql
   psql $DATABASE_URL -v ON_ERROR_STOP=1 -f db/migrations/003_email_verification.sql
   ```
   (Run 003's pre-check query first; see below.) If the new backend is deployed before 003, the `email_verified` column doesn't exist yet, so every user looks unverified and **every login returns 403 "Please verify your email"**.
2. **Check `NODE_ENV=production`** in the Render backend's environment. Without it the server prints codes to the log instead of failing, and cookies aren't marked Secure.
3. **Email sending.** Set `RESEND_API_KEY` and `EMAIL_FROM` only after a sending domain shows as Verified in Resend (see "Sending verification emails" below). Until both are set, production signup returns 500 "Could not send the verification email", so new users can't join. Existing (grandfathered) users can still log in.
4. **Deploy the backend**, then the frontend.
5. **Check client IPs.** Set `LOG_CLIENT_IP=true`, log in once, and read the logged IP. If it's your real IP, the per-IP rate limits can be tightened (`RATE_LIMIT_LOGIN_PER_15MIN`, `RATE_LIMIT_REGISTER_PER_HOUR`, `RATE_LIMIT_VERIFY_PER_15MIN`, `RATE_LIMIT_RESEND_PER_15MIN`). If it's a proxy/Vercel IP, every user shares one bucket, so leave the generous defaults (500 / 200 / 300 / 200). **Remove `LOG_CLIENT_IP` afterwards.**

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

### 002_participant_uniqueness_and_reports.sql

**Purpose**: Stops duplicate event profiles and self-matches, and stores match reports

**What it does**:
- Adds `UNIQUE (user_id, event_id)` to `event_participants`
- Adds `CHECK (user1_id <> user2_id)` to `matches`
- Creates the `reports` table that `POST /matches/:matchId/report` writes to

**Before running**: the UNIQUE constraint fails if a user already has two rows for one event. Check with:
```sql
SELECT user_id, event_id, COUNT(*) FROM event_participants
GROUP BY user_id, event_id HAVING COUNT(*) > 1;
```

**Command**:
```bash
psql $DATABASE_URL -f db/migrations/002_participant_uniqueness_and_reports.sql
```

**Verification**:
```sql
SELECT conname FROM pg_constraint WHERE conname IN ('event_participants_user_event_unique', 'matches_not_self');
SELECT COUNT(*) FROM reports;
```

### 003_email_verification.sql

**Purpose**: Open signup (any email address) with a 6-digit email verification code

**What it does** (one transaction, safe to re-run):
- Lowercases and trims every stored email, then adds a unique index on `lower(email)`
- Adds `users.email_verified` -- every **existing** account is set to `true` (grandfathered); new signups start `false` and can't log in until verified
- Creates `email_verification_codes` (hashed code, expiry, attempt count, resend bookkeeping)

**Before running**: two accounts whose emails differ only by case/whitespace would collide. The migration refuses to run while any exist. Check with:
```sql
SELECT lower(trim(email)), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;
```
Merge or delete one account of each pair first.

**Order**: run this **before** deploying the backend that contains `/api/auth/verify` -- the new code reads `email_verified` and `email_verification_codes`, so login breaks on an un-migrated database.

**Command**:
```bash
psql $DATABASE_URL -v ON_ERROR_STOP=1 -f db/migrations/003_email_verification.sql
```

**Verification**:
```sql
SELECT count(*) FILTER (WHERE email_verified) AS verified, count(*) AS total FROM users;  -- verified = total right after migrating
SELECT indexname FROM pg_indexes WHERE indexname = 'users_email_lower_key';
SELECT count(*) FROM email_verification_codes;
```

**Rollback** (only if the backend is rolled back too):
```sql
DROP TABLE email_verification_codes;
DROP INDEX users_email_lower_key;
ALTER TABLE users DROP COLUMN email_verified;
```

## Sending verification emails (Resend)

Signup emails a 6-digit code through [Resend](https://resend.com). The backend reads two env vars:

| Variable | Example | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_...` | API key from Resend dashboard -> API Keys (sending access is enough) |
| `EMAIL_FROM` | `Dream-Team <noreply@mail.yourdomain.com>` | Sender. Must be on a domain verified in Resend |

Behavior:
- **Both set**: codes are emailed through Resend.
- **Not set, `NODE_ENV` is not `production`** (local dev): nothing is emailed; the server console prints `verification code for <user_id>: <code>` so you can sign up locally.
- **Not set in production**: signup returns 500 "Could not send the verification email" and nobody can verify. Set both before deploying.

Setting up the sending domain (one time):
1. In Resend -> Domains -> Add Domain, enter a domain you own (a subdomain like `mail.yourdomain.com` keeps it separate from your main mail).
2. Resend shows DNS records (an MX + TXT for SPF on a `send` subdomain, and a DKIM TXT record `resend._domainkey`). Add them at your DNS provider exactly as shown.
3. Optionally add a DMARC TXT record on `_dmarc.yourdomain.com` (e.g. `v=DMARC1; p=none;`) -- improves deliverability.
4. Wait for Resend to show the domain as **Verified** (minutes to a few hours).
5. Create an API key, then set `RESEND_API_KEY` and `EMAIL_FROM` (an address on that domain) in the Render backend's environment and redeploy.

Until a domain is verified, Resend only delivers to the email address of the Resend account owner (sending from `onboarding@resend.dev`), which is fine for testing but not for real users.

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
