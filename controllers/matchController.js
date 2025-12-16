const pool = require('../config/database');
const { getCompatibilityScore } = require('../utils/matchingAlgorithm');

//1. FUNCTION THAT RETURNS THE TOP 10 MATCHES IN THE SYSTEM

const findMatch = async(req, res, next) => {
    try {
        //1. GET EVENT ID AND USER ID FROM PARAMETER 
        const eventId = req.params.eventId;
        const userId = req.user.user_id;
        
        //2. CHECK IF EVENT EXISTS
        const exists = await pool.query('SELECT * FROM events WHERE event_id = $1', [eventId]);
        if(exists.rows.length === 0){
            return res.status(404).json({
                error: "This event is not found."
            });
        }
        
        //3. QUERY THE EVENT_PARTICIPANTS TABLE TO FIND USERS IN THE SAME EVENT
        const result = await pool.query(`
            SELECT 
                ep.participant_id,
                ep.role,
                ep.experience,
                ep.skills,
                ep.availability,
                ep.bio,
                u.username
            FROM event_participants ep
            INNER JOIN users u ON ep.user_id = u.user_id
            WHERE ep.event_id = $1
            AND NOT u.user_id = $2
        `, [eventId, userId]);
        
        //In the case where there are no participants
        if(result.rows.length === 0){
            return res.status(404).json({
                error: "There are no participants in this event."
            });
        }
        
        //Get the user and the participant data for them 
        const user = await pool.query('SELECT * FROM event_participants WHERE user_id = $1 AND event_id = $2', [userId, eventId]); 
        
        //If user has not joined the event
        if(user.rows.length === 0){
            return res.status(403).json({
                error: "You must join the event to continue"
            });
        }                                 
        
        //4. Create compatibility scores
        const matches = result.rows.map(participant => ({
            ...participant, 
            compatibility_score: getCompatibilityScore(user.rows[0], participant)
        }));
        
        //5. SORT THEM INTO HIGHEST MATCHES 
        const sorted = matches.sort(function(a,b){return b.compatibility_score - a.compatibility_score});
        
        //6. RETURN TOP 10 
        const top10 = sorted.slice(0,10);
        return res.status(200).json({
            matches: top10
        });

    } catch(error){
        console.log('Get Matches error', error);
        res.status(500).json({
            error: "Internal server error. Please try again later"
        });
    }
}


//2. FUNCTION THAT CREATES THE MATCH
const createMatch = async(req, res, next) => {
    try{
        //1. Get user_ids
        const user_who_initiated = req.user.user_id;
        const user_who_got_liked = req.body.participant_id;
        
        //2. Check if participant exists 
        const exists = await pool.query('SELECT * FROM event_participants WHERE participant_id = $1', [user_who_got_liked]);
        if(exists.rows.length === 0){
            return res.status(404).json({
                error: "Participant not found. Please select another candidate."
            });
        }
        //4. If exists, get the user_id of the participant 
        const target_user_id = exists.rows[0].user_id;
        
        //3. Normalize IDs
        const {user1, user2} = normalizeIds(user_who_initiated, target_user_id);
        
        //4. Check for 3 matches limit
        const successful_matches = await pool.query(
            'SELECT * FROM matches WHERE (user1_id = $1 OR user2_id = $1) AND user1_status = $2 AND user2_status = $3', 
            [user_who_initiated, 'liked', 'liked']
        );
        if(successful_matches.rows.length >= 3){
            return res.status(401).json({
                error: "This request is unauthorized. The user has already selected 3 participants"
            });
        }
        
        //5. Check if match already exists
        const result = await pool.query('SELECT * FROM matches WHERE user1_id = $1 AND user2_id = $2', [user1, user2]);
        
        //6. If match exists - UPDATE
        if(result.rows.length > 0){
            const match = result.rows[0];
            if(match.initiated_by === user_who_initiated){ 
                return res.status(404).json({
                    error: "Cannot like the same participant twice"
                });
            } else {
                if(user_who_initiated === user1){
                    const match1 = await pool.query(
                        'UPDATE matches SET user1_status = $1, matched_at = CURRENT_TIMESTAMP WHERE user1_id = $2 AND user2_id = $3 RETURNING *', 
                        ['liked', user1, user2]
                    );
                    const matched1 = match1.rows[0];
                    return res.status(200).json({
                        match: {
                            match_id: matched1.match_id, 
                            user1_id: matched1.user1_id, 
                            user2_id: matched1.user2_id, 
                            event_id: matched1.event_id,  
                            initiated_by: matched1.initiated_by,
                            user1_status: matched1.user1_status, 
                            user2_status: matched1.user2_status, 
                            created_at: matched1.created_at, 
                            matched_at: matched1.matched_at
                        },
                        message: "You are now matched with this candidate"
                    });
                } else {
                    const match2 = await pool.query(
                        'UPDATE matches SET user2_status = $1, matched_at = CURRENT_TIMESTAMP WHERE user1_id = $2 AND user2_id = $3 RETURNING *', 
                        ['liked', user1, user2]
                    );
                    const matched2 = match2.rows[0];
                    return res.status(200).json({
                        match: {
                            match_id: matched2.match_id, 
                            user1_id: matched2.user1_id, 
                            user2_id: matched2.user2_id, 
                            event_id: matched2.event_id,  
                            initiated_by: matched2.initiated_by,
                            user1_status: matched2.user1_status, 
                            user2_status: matched2.user2_status, 
                            created_at: matched2.created_at, 
                            matched_at: matched2.matched_at
                        },
                        message: "You are now matched with this candidate"
                    });
                }
            }
        }
        
        //7. If match doesn't exist - CREATE
        if(user1 === user_who_initiated){
            const new_match = await pool.query(
                'INSERT INTO matches(user1_id, user2_id, event_id, initiated_by, user1_status, user2_status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', 
                [user1, user2, req.params.eventId, req.user.user_id, 'liked', 'pending']
            ); 
            const new_match_created = new_match.rows[0];
            return res.status(200).json({
                new_match: {
                    match_id: new_match_created.match_id,
                    initiated_by: new_match_created.initiated_by,
                    user1_status: new_match_created.user1_status,
                    user2_status: new_match_created.user2_status,
                    created_at: new_match_created.created_at,
                }
            });
        } else {
            const new_match1 = await pool.query(
                'INSERT INTO matches(user1_id, user2_id, event_id, initiated_by, user1_status, user2_status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', 
                [user1, user2, req.params.eventId, req.user.user_id, 'pending', 'liked']
            ); 
            const new_match_created1 = new_match1.rows[0];
            return res.status(200).json({
                new_match: {
                    match_id: new_match_created1.match_id,
                    initiated_by: new_match_created1.initiated_by,
                    user1_status: new_match_created1.user1_status,
                    user2_status: new_match_created1.user2_status,
                    created_at: new_match_created1.created_at,
                }
            });
        }

    } catch(error){
        console.log('Liking Match error', error);
        res.status(500).json({
            error: "Internal Server Error. Please try again later."
        });
    }
}

//3. GET MUTUAL MATCHES
const getMutualMatches = async(req, res) => {
    try {
        // 1. Get current user ID from where?
        const userId = req.user.user_id;
        // 2. Get eventId from where?
        const eventId = req.params.eventId;
        // 3. Query matches
        const matches = await pool.query(`
            SELECT 
                m.*,
                CASE 
                    WHEN m.user1_id = $1 THEN u2.username 
                    ELSE u1.username 
                END as other_username,
                CASE 
                    WHEN m.user1_id = $1 THEN u2.email
                    ELSE u1.email 
                END as other_email,
                CASE 
                    WHEN m.user1_id = $1 THEN ep2.role 
                    ELSE ep1.role 
                END as other_role,
                CASE 
                    WHEN m.user1_id = $1 THEN ep2.skills 
                    ELSE ep1.skills 
                END as other_skills,
                CASE 
                    WHEN m.user1_id = $1 THEN ep2.experience 
                    ELSE ep1.experience 
                END as other_experience,
                CASE 
                    WHEN m.user1_id = $1 THEN ep2.availability 
                    ELSE ep1.availability 
                END as other_availability,
                CASE 
                    WHEN m.user1_id = $1 THEN ep2.bio 
                    ELSE ep1.bio 
                END as other_bio
            FROM matches m
            LEFT JOIN users u1 ON m.user1_id = u1.user_id
            LEFT JOIN users u2 ON m.user2_id = u2.user_id
            LEFT JOIN event_participants ep1 ON m.user1_id = ep1.user_id
            LEFT JOIN event_participants ep2 ON m.user2_id = ep2.user_id
            WHERE (m.user1_id = $1 OR m.user2_id = $1)
            AND m.user1_status = $2
            AND m.user2_status = $3`
        , [userId, 'liked', 'liked']);
        // 4. Return results
        return res.status(200).json({
            mutual: matches.rows
        });    
    } catch (error) {
        // Handle error
        console.error('Get mutual matches error: ', error);
        return res.status(500).json({
            error: "Internal Server Error. Please try again later"
        });
    }
};

//4. GET PENDING MATCHES 
const getPendingMatches = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const eventId = req.params.eventId;
        
        // Get all matches where at least one status is pending
        const matches = await pool.query(`
            SELECT 
                m.*,
                CASE 
                    WHEN m.user1_id = $1 THEN u2.username 
                    ELSE u1.username 
                END as other_username,
                CASE 
                    WHEN m.user1_id = $1 THEN u2.user_id 
                    ELSE u1.user_id 
                END as other_user_id,
                CASE 
                    WHEN m.user1_id = $1 THEN ep2.role 
                    ELSE ep1.role 
                END as other_role,
                CASE 
                    WHEN m.user1_id = $1 THEN ep2.experience 
                    ELSE ep1.experience 
                END as other_experience,
                CASE 
                    WHEN m.user1_id = $1 THEN ep2.participant_id 
                    ELSE ep1.participant_id 
                END as other_participant_id, 
                CASE 
                    WHEN m.user1_id = $1 THEN ep2.availability 
                    ELSE ep1.availability 
                END as other_availability,
                CASE 
                    WHEN m.user1_id = $1 THEN ep2.skills 
                    ELSE ep1.skills 
                END as other_skills,
                CASE 
                    WHEN m.user1_id = $1 THEN ep2.bio 
                    ELSE ep1.bio 
                END as other_bio,
                CASE
                    WHEN m.user1_id = $1 THEN 
                        CASE WHEN m.user2_status = 'liked' AND m.user1_status = 'pending' THEN true ELSE false END
                    ELSE
                        CASE WHEN m.user1_status = 'liked' AND m.user2_status = 'pending' THEN true ELSE false END
                END as needs_my_response
            FROM matches m
            LEFT JOIN users u1 ON m.user1_id = u1.user_id
            LEFT JOIN users u2 ON m.user2_id = u2.user_id
            LEFT JOIN event_participants ep1 ON m.user1_id = ep1.user_id AND ep1.event_id = $2
            LEFT JOIN event_participants ep2 ON m.user2_id = ep2.user_id AND ep2.event_id = $2
            WHERE (m.user1_id = $1 OR m.user2_id = $1)
            AND m.event_id = $2
            AND (m.user1_status = 'pending' OR m.user2_status = 'pending')
            AND NOT (m.user1_status = 'liked' AND m.user2_status = 'liked')
            ORDER BY m.created_at DESC`,
            [userId, eventId]
        );

        //if no pending matches are fond 
        if(matches.rows.length === 0){
            return res.status(404).json({
                error: "You or any other participants have not initiated any matches"
            });
        }
        
        return res.status(200).json({
            pending: matches.rows
        });
        
    } catch (error) {
        console.error('Get pending matches error:', error);
        return res.status(500).json({
            error: 'Failed to get pending matches'
        });
    }
};


//FUNCTION TO NORMALIZE IDS

function normalizeIds(val1, val2){
    const array = [val1, val2];
    array.sort();
    const [first, second] = array;
    return {user1: first, user2: second};
}

module.exports = {findMatch, createMatch, getMutualMatches, getPendingMatches};