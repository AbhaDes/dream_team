//import event_id 
const {CURRENT_EVENT_ID} = require('../config/constants');
//import database pool 
const pool = require('../config/database');
const event_id = CURRENT_EVENT_ID;

//EVENT HANDLING LOGIC
//1. Joining an Event
const joinEvent = async(req, res, next) => {
    try{
        //1.Get eventId from the parameter 
        const eventId = req.params.eventId;
        const userId = req.user.user_id;
        //2. Get all the other info from the request body
        const {role, experience, availability, skills, bio} = req.body;
        //2. check if the event exists 
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

module.exports = {joinEvent};