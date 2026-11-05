-- pgvector extension for storing bio embeddings (requires a pgvector-enabled
-- Postgres image, e.g. pgvector/pgvector:pg16)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    user_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    -- the API stores emails trimmed + lowercased
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(60) NOT NULL,
    -- false until the user enters the code emailed at signup; login requires true
    email_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- one account per address regardless of case
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

-- the pending 6-digit verification code for an unverified user (at most one).
-- Only an HMAC-SHA256 of the code is stored; the row is deleted once verified.
CREATE TABLE email_verification_codes (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    code_hash CHAR(64),              -- NULL = no live code (used up / too many tries)
    expires_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_sent_at TIMESTAMPTZ,        -- 60s resend cooldown
    send_count INTEGER NOT NULL DEFAULT 0,
    send_window_start TIMESTAMPTZ    -- max 5 sends per hour
);

CREATE TABLE events (
    event_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE role_type AS ENUM (
    'Frontend Developer', 
    'Backend Developer',
    'Full-stack Developer', 
    'UI/UX Designer', 
    'Product Manager' 
);
CREATE TYPE availability_type AS ENUM (
    'Full Time (30+ hours)',
    'Most of the Time (20-30 hours)',
    'Part Time (10-20 hours)',
    'Limited (Less than 10 hours)',
    'Flexible Schedule'
);
CREATE TYPE experience_level AS ENUM (
    'Beginner', 
    'Advanced', 
    'Intermediate'
);

CREATE TABLE event_participants(
    participant_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    event_id UUID REFERENCES events(event_id),
    role role_type NOT NULL, 
    experience experience_level NOT NULL, 
    availability availability_type NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    skills TEXT[],
    bio VARCHAR(300),
    -- embedding of the composed profile description (role, experience,
    -- availability, skills, bio). 1536 dims = text-embedding-3-small;
    -- null until the embedding service fills it
    profile_embedding vector(1536),

    -- one profile per user per event (same name as in migration 002)
    CONSTRAINT event_participants_user_event_unique UNIQUE (user_id, event_id)
);

CREATE TYPE match_type AS ENUM (
    'liked', 
    'pending'
);

CREATE TABLE matches (
  match_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES users(user_id),
  user2_id UUID REFERENCES users(user_id),
  event_id UUID REFERENCES events(event_id),
  initiated_by UUID REFERENCES users(user_id),
  user1_status match_type NOT NULL,
  user2_status match_type NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  matched_at TIMESTAMP, 
  
  -- Constraint:
  UNIQUE(user1_id, user2_id, event_id),
  -- same name as in migration 002
  CONSTRAINT matches_not_self CHECK (user1_id <> user2_id)
);

-- Reports filed against a match; kept so they can be reviewed
-- (deleting the match afterwards shouldn't lose the report)
CREATE TABLE reports (
  report_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(match_id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(event_id),
  reporter_id UUID REFERENCES users(user_id),
  reported_user_id UUID REFERENCES users(user_id),
  reason VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- one report per reporter per match (same name as in migration 002)
  CONSTRAINT reports_reporter_match_unique UNIQUE (match_id, reporter_id)
);
-- Session storage for express-session via connect-pg-simple
-- (also auto-created at runtime by createTableIfMissing in server.js)
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX "IDX_session_expire" ON "session" ("expire");
