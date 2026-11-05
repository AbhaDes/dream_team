//this is used to define one event_id used throughout the app for the MVP 
module.exports = {
    CURRENT_EVENT_ID : "984fe278-f734-4222-a614-5a5f19f3d798", 
    CURRENT_EVENT_NAME : "SFSU Fall Hackathon 2025",

    //must stay in sync with the enums in db/schema.sql -- anything else
    //makes Postgres throw, which used to surface as a 500
    ROLES : ['Frontend Developer', 'Backend Developer', 'Full-stack Developer', 'UI/UX Designer', 'Product Manager'],
    EXPERIENCE_LEVELS : ['Beginner', 'Intermediate', 'Advanced'],
    AVAILABILITY_OPTIONS : [
        'Full Time (30+ hours)',
        'Most of the Time (20-30 hours)',
        'Part Time (10-20 hours)',
        'Limited (Less than 10 hours)',
        'Flexible Schedule'
    ],
    BIO_MAX_LENGTH : 300, //bio is VARCHAR(300)
    MAX_TEAMMATES : 3
};