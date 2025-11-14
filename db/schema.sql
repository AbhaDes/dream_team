CREATE TABLE users{
    user_id UUID PRIMARY KEY gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password VARCHAR(60) NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    joined_at TIMESTAMP NOT NULL, 
   
}

CREATE TABLE events{
    event_id UUID PRIMARY KEY gen_random_uuid(),
    event_name VARCHAR(300) NOT NULL,
    start_date TIMESTAMP NOT NULL, 
    status VARCHAR(100) NOT NULL, 
    end_date TIMESTAMP NOT NULL, 
    location VARCHAR(300) NOT NULL,
    description VARCHAR(1000) NOT NULL
}