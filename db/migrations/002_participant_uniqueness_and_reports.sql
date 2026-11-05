-- One participant row per user per event, no self-matches, and a table so
-- match reports are kept instead of only being logged.
-- Safe to re-run: every step checks whether it has already been applied, and
-- the whole file runs in one transaction.
--
-- Run with ON_ERROR_STOP so a failure stops the script and rolls back
-- (without it psql would carry on past an error and leave the transaction aborted):
--   psql -v ON_ERROR_STOP=1 $DATABASE_URL -f db/migrations/002_participant_uniqueness_and_reports.sql
--
-- The constraints fail if offending rows already exist. Find them first with:
--   SELECT user_id, event_id, COUNT(*) FROM event_participants
--   GROUP BY user_id, event_id HAVING COUNT(*) > 1;
--   SELECT * FROM matches WHERE user1_id = user2_id;
--   SELECT match_id, reporter_id, COUNT(*) FROM reports
--   GROUP BY match_id, reporter_id HAVING COUNT(*) > 1;
-- and decide which rows to keep before running this.

BEGIN;

DO $$
BEGIN
    -- a DB built from the current schema.sql already has an equivalent unique
    -- constraint under the same name
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'event_participants_user_event_unique'
          AND conrelid = 'event_participants'::regclass
    ) THEN
        ALTER TABLE event_participants
            ADD CONSTRAINT event_participants_user_event_unique UNIQUE (user_id, event_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'matches_not_self'
          AND conrelid = 'matches'::regclass
    ) THEN
        ALTER TABLE matches
            ADD CONSTRAINT matches_not_self CHECK (user1_id <> user2_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS reports (
    report_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES matches(match_id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(event_id),
    reporter_id UUID REFERENCES users(user_id),
    reported_user_id UUID REFERENCES users(user_id),
    reason VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- one report per reporter per match; also stops two simultaneous duplicate
-- reports that both pass the controller's duplicate check
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'reports_reporter_match_unique'
          AND conrelid = 'reports'::regclass
    ) THEN
        ALTER TABLE reports
            ADD CONSTRAINT reports_reporter_match_unique UNIQUE (match_id, reporter_id);
    END IF;
END $$;

COMMIT;
