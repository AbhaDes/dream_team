//import event_id 
const {CURRENT_EVENT_ID} = require('../config/constants');
//import database pool 
const pool = require('../config/database');

const event_id = CURRENT_EVENT_ID;

//EVENT HANDLING LOGIC


//1. Joining an Event
/**
 * Join an event as a participant.
 *
 * This handler:
 *  1. Extracts the event ID from the URL params and user ID from the authenticated user.
 *  2. Validates that the event exists.
 *  3. Validates required participant fields in the request body.
 *  4. Checks if the user has already joined this event.
 *  5. Inserts a new event_participants row if valid, and returns the created participant profile.
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 */
const joinEvent = async(req, res, next) => {
    try{
        //1.Get eventId from the parameter 
        const eventId = req.params.eventId;
        const userId = req.user.user_id;
        //2. Get all the other info from the request body
        const {role, experience, availability, skills, bio} = req.body;
        //3. check if the event exists 
        const result = await pool.query('SELECT * FROM events WHERE event_id = $1', [eventId]);
        if(result.rows.length === 0){
            return res.status(404).json({
                error: 'This event does not exist'
            });
        }
        //4. if exist, check if all feilds are being filled
        if(!role || !experience || !availability || !skills ||!bio){ //bio required for now till I figure out how to change that
            return res.status(400).json({
                error: 'Missing required feilds'
            });
        }
        //5. If all feilds are filled, check if they have already joined the event 
        //-- check if the eventparticipant_id exists for a particular event_id. If exists, they have already joined the event
        const exists = await pool.query('SELECT * FROM event_participants WHERE user_id = $1 AND event_id = $2', [userId, eventId]);
        if(exists.rows.length > 0){
            return res.status(409).json({
                error: 'You have already joined this event'
            });
        }
        //6. if not, then insert into table and return profile info
        const insert = await pool.query('INSERT INTO event_participants(user_id, event_id, role, experience, availability, skills, bio) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', 
            [userId, eventId, role, experience, availability, skills, bio]
        );
        const newEvent_participant = insert.rows[0];
        return res.status(200).json({
            event_participant: {
                participant_id: newEvent_participant.participant_id,
                user_id: newEvent_participant.user_id,
                event_id: newEvent_participant.event_id,
                role : newEvent_participant.role, 
                experience: newEvent_participant.experience,
                availability: newEvent_participant.availability,
                skills: newEvent_participant.skills, 
                bio : newEvent_participant.bio
            }, 
            message: 'Joined Event successfully'
        });
    }catch(error){
        console.error('Join Event error: ', error);
        res.status(500).json({ 
            error: 'Failed to join event. Please try again.' 
        });

    }

}

//2. Get Participants profile in the event
const getParticipant = async(req, res, next) =>{
    try{
        //1. Get the eventId and the participantId from the parameter
        const {eventId, participantId} = req.params;

        //2. Check if the event exists
        const eventCheck = await pool.query('SELECT * FROM events WHERE event_id = $1', [eventId]);
        if(eventCheck.rows.length === 0){
            return res.status(404).json({
                error: 'This event does not exist'
            });
        }
        //3. SQL query with INNER JOIN
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
            WHERE ep.participant_id = $1 AND ep.event_id = $2
            `, [participantId, eventId]);
                                     
        //4. Participant not found
        if(result.rows.length === 0){
            return res.status(404).json({
                error: "Participant not found for this event"

            });
        } 
        //5. Participant found
        const participant = result.rows[0];
        return res.status(200).json({
            participant: {
            participant_id: participant.participant_id,
            name : participant.username,
            role : participant.role, 
            experience: participant.experience,
            availability: participant.availability,
            skills: participant.skills, 
            bio : participant.bio
            },

            });    

    }catch(error){
        console.error('Get participant error: ' , error);
        res.status(500).json({
            error: "Internal Server Error. Please try again later"
        });
    }
}

const getMe = async(req, res, next) => {
    try{
        //get the user id from the authMiddleware, and get the eventId from the parameters
        const userId = req.user.user_id;
        const eventId = req.params.eventId; 
        //check if any participant exists with that id for that event
        const check = await pool.query('SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2', [eventId, userId]);
        //if not, tell them to join the event
        if(check.rows.length === 0){
            return res.status(404).json({
                error: "Participant not found for this event. Please join this event"
            });


        }
        res.status(200).json({
            profile:result.rows[0]
        })

    }catch(error){
        console.error('Get participant error: ' , error);
        res.status(500).json({
            error: "Internal Server Error. Please try again later"
        });

    }

}


module.exports = {joinEvent, getParticipant, getMe};