-- Adds pgvector + the bio_embedding column to an existing database.
-- Run once against any DB created before this migration existed:
--   docker-compose exec db psql -U abhadeshpande -d dream_team -f - < db/migrations/001_add_bio_embedding.sql
-- (or paste into psql on the hosted production DB)

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE event_participants
    ADD COLUMN IF NOT EXISTS bio_embedding vector(1536);
