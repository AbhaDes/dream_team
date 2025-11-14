CREATE TABLE event (
    event_id INTEGER PRIMARY KEY,
    event_name VARCHAR,
    start_date TIMESTAMP,
    status VARCHAR,
    end_date TIMESTAMP,
    max_participants INTEGER,
    location VARCHAR,
    Description VARCHAR,
);

CREATE TABLE match(
    match_id VARCHAR,
    event_id VARCHAR,
    user1_id VARCHAR,
    user2_id VARCHAR,
    initiated_by VARCHAR,
    user1_status VARCHAR,
    user2_status VARCHAR,
    match_status VARCHAR,
    created_at TIMESTAMP,
);
