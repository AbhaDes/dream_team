-- 003: open signup with email verification
--  * emails are stored trimmed + lowercased and are unique regardless of case
--  * users.email_verified (existing accounts are grandfathered as verified)
--  * email_verification_codes holds the hashed 6-digit signup code
--
-- PRE-CHECK -- run this first. Any row it returns is two accounts that differ
-- only by case/whitespace; merge or delete one of each pair before migrating
-- (the migration refuses to run while any exist):
--
--   SELECT lower(trim(email)), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;
--
-- Safe to re-run: every step is a no-op the second time.

BEGIN;

-- 1. Stop with a clear message if normalizing would merge two accounts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users GROUP BY lower(trim(email)) HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'users has emails that collide after lower(trim(email)); resolve them first (see the pre-check query at the top of this file)';
    END IF;
END $$;

-- 2. Normalize stored emails
UPDATE users SET email = lower(trim(email)) WHERE email <> lower(trim(email));

-- 3. One account per address regardless of case
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));

-- 4. Verification flag. Added with DEFAULT true so every EXISTING account is
--    grandfathered as verified, then the default flips to false for new signups.
--    (On a re-run the column already exists, so pending accounts stay unverified.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;

-- 5. Pending codes: only an HMAC-SHA256 of the code is stored
CREATE TABLE IF NOT EXISTS email_verification_codes (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    code_hash CHAR(64),              -- NULL = no live code (used up / too many tries)
    expires_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_sent_at TIMESTAMPTZ,        -- 60s resend cooldown
    send_count INTEGER NOT NULL DEFAULT 0,
    send_window_start TIMESTAMPTZ    -- max 5 sends per hour
);

COMMIT;
