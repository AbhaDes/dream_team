-- One participant row per user per event, no self-matches, and a table so
-- match reports are kept instead of only being logged.
-- Run once against any DB created before this migration existed:
--   psql $DATABASE_URL -f db/migrations/002_participant_uniqueness_and_reports.sql
--
-- The UNIQUE constraint fails if duplicates already exist. Find them first with:
--   SELECT user_id, event_id, COUNT(*) FROM event_participants
--   GROUP BY user_id, event_id HAVING COUNT(*) > 1;
-- and decide which row to keep before running this.

ALTER TABLE event_participants
    ADD CONSTRAINT event_participants_user_event_unique UNIQUE (user_id, event_id);

ALTER TABLE matches
    ADD CONSTRAINT matches_not_self CHECK (user1_id <> user2_id);

CREATE TABLE IF NOT EXISTS reports (
    report_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES matches(match_id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(event_id),
    reporter_id UUID REFERENCES users(user_id),
    reported_user_id UUID REFERENCES users(user_id),
    reason VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
