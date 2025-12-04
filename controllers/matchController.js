//import the user pool from database.js
const { CURRENT_EVENT_ID } = require('../config/constants');
const pool = require('../config/database');
const {getCompatibilityScore} = require('../utils/matchingAlgorithm');


const findMatch = async(req, res, next) => {
    try{
    //1. ATHENTICATE USER FIRST--authmiddleware called for this
    //2. GET EVENT ID AND USER ID FROM PARAMETER 
    const eventId = req.params.eventId;
    const userId = req.user.user_id;
    //3. CHECK IF EVENT EXISTS
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
            `,  [eventId, userId]);
    //In the case where there are no participants
    if(result.rows.length === 0){
        return res.status(404).json({
            error: "There are no participants for this event."
        });
    }
    //Get the user and the participant data for them 
    const user = await pool.query('SELECT * FROM event_participants WHERE user_id= $1 AND event_id = $2', [userId, eventId]); 
    //If user has not joined the event
    if(user.rows.length === 0){
        return res.status(403).json({
            error: "You must join the event to continue"
        });
    }                                 
    //4. Create new category compatibility_score, map to each participant, call get compatibility function, store it in a new array
    const matches = result.rows.map(participant => ({...participant, compatibility_score: getCompatibilityScore(user.rows[0], participant)}));
    //5. SORT THEM INTO HIGHEST MATCHES 
    const sorted = matches.sort(function(a,b){return b.compatibility_score - a.compatibility_score});
    //6. RETURN TOP 10 
    const top10 = sorted.slice(0,10);
    res.status(200).json({
        matches: top10
    });

    }catch(error){
        console.log('Get Matches error', error);
        res.status(500).json({
            error: "Internal server error. Please try again later"
        });
    }
}

module.exports = {findMatch};
