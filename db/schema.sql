CREATE TABLE users (
    user_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(60) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    'Product Manager', 
    'Data Scientist', 
    'DevOps Engineer', 
    'Mobile Developer'
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
    bio VARCHAR(300)    
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
  UNIQUE(user1_id, user2_id, event_id)
);