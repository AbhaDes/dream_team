-- Adds pgvector + the profile_embedding column to an existing database.
-- Run once against any DB created before this migration existed:
--   docker-compose exec -T db psql -U abhadeshpande -d dream_team < db/migrations/001_add_profile_embedding.sql
-- (or paste into psql on the hosted production DB)

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE event_participants
    ADD COLUMN IF NOT EXISTS profile_embedding vector(1536);
