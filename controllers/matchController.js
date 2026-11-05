const pool = require('../config/database');
const { getCompatibilityScore } = require('../utils/matchingAlgorithm');
const { MAX_TEAMMATES } = require('../config/constants');

//sent when the match row disappears mid-like (the other person hit undo)
const MATCH_CHANGED = "This match changed. Refresh and try again.";

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
        
        //3. GET THE USER'S OWN PARTICIPANT ROW (needed for both ranking paths)
        const user = await pool.query('SELECT * FROM event_participants WHERE user_id = $1 AND event_id = $2', [userId, eventId]);

        //If user has not joined the event
        if(user.rows.length === 0){
            return res.status(403).json({
                error: "You must join the event to continue"
            });
        }
        const myEmbedding = user.rows[0].profile_embedding;

        //4a. PRIMARY PATH: rank by profile-embedding cosine similarity in SQL.
        //Participants without an embedding rank last with a score of 0
        //(the backfill script fills them in).
        if(myEmbedding){
            const result = await pool.query(`
                SELECT
                    ep.participant_id,
                    ep.role,
                    ep.experience,
                    ep.skills,
                    ep.availability,
                    ep.bio,
                    u.username,
                    CASE WHEN ep.profile_embedding IS NOT NULL
                        THEN (ROUND(((1 - (ep.profile_embedding <=> $3)) * 100)::numeric))::int
                        ELSE 0
                    END AS compatibility_score
                FROM event_participants ep
                INNER JOIN users u ON ep.user_id = u.user_id
                WHERE ep.event_id = $1
                AND NOT u.user_id = $2
                AND NOT EXISTS (
                    SELECT 1 FROM matches m
                    WHERE m.event_id = $1
                    AND ((m.user1_id = $2 AND m.user2_id = u.user_id)
                      OR (m.user1_id = u.user_id AND m.user2_id = $2))
                )
                ORDER BY ep.profile_embedding <=> $3 NULLS LAST
                LIMIT 10
            `, [eventId, userId, myEmbedding]);

            return res.status(200).json({
                matches: result.rows
            });
        }

        //4b. FALLBACK: user has no embedding yet (service was down when they
        //joined) — use the old rule-based scoring so matches still work.
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
            AND NOT EXISTS (
                SELECT 1 FROM matches m
                WHERE m.event_id = $1
                AND ((m.user1_id = $2 AND m.user2_id = u.user_id)
                  OR (m.user1_id = u.user_id AND m.user2_id = $2))
            )
        `, [eventId, userId]);

        const matches = result.rows.map(participant => ({
            ...participant,
            compatibility_score: getCompatibilityScore(user.rows[0], participant)
        }));

        const sorted = matches.sort(function(a,b){return b.compatibility_score - a.compatibility_score});

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
        //req.body is undefined when no JSON body was sent
        const body = req.body ?? {};
        const user_who_got_liked = body.participant_id;
        const eventId = req.params.eventId;

        if(!user_who_got_liked){
            return res.status(400).json({
                error: "participant_id is required"
            });
        }

        //2. The liker must have joined this event
        const me = await pool.query('SELECT 1 FROM event_participants WHERE user_id = $1 AND event_id = $2', [user_who_initiated, eventId]);
        if(me.rows.length === 0){
            return res.status(403).json({
                error: "You must join the event to continue"
            });
        }

        //3. Check the participant exists IN THIS EVENT
        const exists = await pool.query('SELECT * FROM event_participants WHERE participant_id = $1 AND event_id = $2', [user_who_got_liked, eventId]);
        if(exists.rows.length === 0){
            return res.status(404).json({
                error: "Participant not found. Please select another candidate."
            });
        }
        //4. If exists, get the user_id of the participant
        const target_user_id = exists.rows[0].user_id;
        if(target_user_id === user_who_initiated){
            return res.status(400).json({
                error: "You cannot like yourself"
            });
        }

        //5. Normalize IDs
        const {user1, user2} = normalizeIds(user_who_initiated, target_user_id);

        //Steps 6-11 run in one transaction on a dedicated client so two likes
        //can't both pass the teammate check and push someone past the limit
        const client = await pool.connect();
        //ends the transaction and sends an error response
        const reject = async (status, error) => {
            await client.query('ROLLBACK');
            return res.status(status).json({ error });
        };
        try {
            await client.query('BEGIN');

            //6. Lock both users' participant rows for this event. Every like
            //touching either user waits here, and locking in user_id order means
            //A->B and B->A can't deadlock each other.
            await client.query(
                'SELECT participant_id FROM event_participants WHERE event_id = $1 AND user_id = ANY($2::uuid[]) ORDER BY user_id FOR UPDATE',
                [eventId, [user1, user2]]
            );

            //7. Check if match already exists for this event
            const result = await client.query('SELECT * FROM matches WHERE user1_id = $1 AND user2_id = $2 AND event_id = $3', [user1, user2, eventId]);
            let match = result.rows[0];

            //8. Duplicate like / already matched (checked before the limit so a
            //full team re-liking gets the real reason)
            if(match){
                const duplicate = duplicateLikeError(match, user_who_initiated);
                if(duplicate){
                    return await reject(409, duplicate);
                }
            }

            //9. Check the teammate limit for this event
            //409, not 401: the request is authenticated, it just conflicts with the
            //team-size rule. A 401 here makes the frontend treat it as a dead session.
            if(await countTeammates(client, user_who_initiated, eventId) >= MAX_TEAMMATES){
                return await reject(409, `You have already matched with ${MAX_TEAMMATES} teammates`);
            }

            //10. If match doesn't exist - CREATE (the initiator's side starts as liked)
            if(!match){
                const [user1_status, user2_status] = user1 === user_who_initiated ? ['liked', 'pending'] : ['pending', 'liked'];
                const new_match = await client.query(
                    'INSERT INTO matches(user1_id, user2_id, event_id, initiated_by, user1_status, user2_status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user1_id, user2_id, event_id) DO NOTHING RETURNING *',
                    [user1, user2, eventId, user_who_initiated, user1_status, user2_status]
                );
                if(new_match.rows.length > 0){
                    await client.query('COMMIT');
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
                }
                //the other person's first like landed first: treat this as a like-back
                const reread = await client.query('SELECT * FROM matches WHERE user1_id = $1 AND user2_id = $2 AND event_id = $3', [user1, user2, eventId]);
                match = reread.rows[0];
                //the conflicting row was deleted (undo) before we could read it
                if(!match){
                    return await reject(409, MATCH_CHANGED);
                }
                const duplicate = duplicateLikeError(match, user_who_initiated);
                if(duplicate){
                    return await reject(409, duplicate);
                }
            }

            //11. Match exists - UPDATE
            //liking back completes the match, so it fills a slot on THEIR team too
            if(await countTeammates(client, target_user_id, eventId) >= MAX_TEAMMATES){
                return await reject(409, "This participant's team is already full");
            }
            //which column is mine depends on the normalized order (never user input)
            const myStatusColumn = user_who_initiated === user1 ? 'user1_status' : 'user2_status';
            const updated = await client.query(
                `UPDATE matches SET ${myStatusColumn} = $1, matched_at = CURRENT_TIMESTAMP WHERE match_id = $2 RETURNING *`,
                ['liked', match.match_id]
            );
            //the match was deleted (undo) between the read and the update
            if(updated.rowCount === 0){
                return await reject(409, MATCH_CHANGED);
            }
            await client.query('COMMIT');
            const matched = updated.rows[0];
            return res.status(200).json({
                match: {
                    match_id: matched.match_id,
                    user1_id: matched.user1_id,
                    user2_id: matched.user2_id,
                    event_id: matched.event_id,
                    initiated_by: matched.initiated_by,
                    user1_status: matched.user1_status,
                    user2_status: matched.user2_status,
                    created_at: matched.created_at,
                    matched_at: matched.matched_at
                },
                message: "You are now matched with this candidate"
            });
        } catch(error){
            await client.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            client.release();
        }

    } catch(error){
        //23505 = unique violation. ON CONFLICT covers the like race, so this is
        //only a safety net.
        if(error.code === '23505'){
            return res.status(409).json({
                error: "This like was already recorded. Refresh to see your matches."
            });
        }
        //22P02 = malformed UUID (participant_id or eventId)
        if(error.code === '22P02'){
            return res.status(400).json({
                error: "Invalid id in request"
            });
        }
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
            LEFT JOIN event_participants ep1 ON m.user1_id = ep1.user_id AND ep1.event_id = $4
            LEFT JOIN event_participants ep2 ON m.user2_id = ep2.user_id AND ep2.event_id = $4
            WHERE (m.user1_id = $1 OR m.user2_id = $1)
            AND m.event_id = $4
            AND m.user1_status = $2
            AND m.user2_status = $3`
        , [userId, 'liked', 'liked', eventId]);
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

//5. DELETE A MATCH (UNDO)
const deleteMatch = async(req, res) => {
    try {
        const userId = req.user.user_id;
        const eventId = req.params.eventId;
        const matchId = req.params.matchId;

        // Get the match to verify ownership
        const matchResult = await pool.query(
            'SELECT * FROM matches WHERE match_id = $1 AND event_id = $2',
            [matchId, eventId]
        );

        if (matchResult.rows.length === 0) {
            return res.status(404).json({
                error: "Match not found"
            });
        }

        const match = matchResult.rows[0];

        // Check if current user is one of the match participants
        if (match.user1_id !== userId && match.user2_id !== userId) {
            return res.status(403).json({
                error: "You can only delete matches you are part of"
            });
        }

        // Delete the match
        await pool.query(
            'DELETE FROM matches WHERE match_id = $1',
            [matchId]
        );

        return res.status(200).json({
            message: "Match deleted successfully"
        });

    } catch (error) {
        //22P02 = malformed UUID in matchId or eventId
        if (error.code === '22P02') {
            return res.status(400).json({
                error: "Invalid id in request"
            });
        }
        console.error('Delete match error:', error);
        return res.status(500).json({
            error: "Internal Server Error. Please try again later"
        });
    }
};

//6. REPORT A MATCH
const reportMatch = async(req, res) => {
    try {
        const userId = req.user.user_id;
        const eventId = req.params.eventId;
        const matchId = req.params.matchId;
        //req.body is undefined when no JSON body was sent
        const body = req.body ?? {};
        const { reason } = body;

        if (typeof reason !== 'string' || reason.trim().length === 0) {
            return res.status(400).json({
                error: "Report reason is required"
            });
        }

        // Get the match to verify ownership
        const matchResult = await pool.query(
            'SELECT * FROM matches WHERE match_id = $1 AND event_id = $2',
            [matchId, eventId]
        );

        if (matchResult.rows.length === 0) {
            return res.status(404).json({
                error: "Match not found"
            });
        }

        const match = matchResult.rows[0];

        // Check if current user is one of the match participants
        if (match.user1_id !== userId && match.user2_id !== userId) {
            return res.status(403).json({
                error: "You can only report matches you are part of"
            });
        }

        // One report per reporter per match
        const existingReport = await pool.query(
            'SELECT 1 FROM reports WHERE match_id = $1 AND reporter_id = $2',
            [matchId, userId]
        );
        if (existingReport.rows.length > 0) {
            return res.status(409).json({
                error: "You have already reported this match"
            });
        }

        // Determine the reported user
        const reportedUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

        // Save the report so it survives restarts and can be reviewed
        await pool.query(
            'INSERT INTO reports(match_id, event_id, reporter_id, reported_user_id, reason) VALUES ($1, $2, $3, $4, $5)',
            [matchId, eventId, userId, reportedUserId, reason.trim().slice(0, 1000)]
        );

        // Also log it so it shows up in the server logs right away. IDs only:
        // emails and the reason stay in the reports table, not in the logs.
        // TODO: email the admin too (SMTP or a service like SendGrid)
        console.log(`
            REPORT SUBMITTED
            ================
            Match ID: ${matchId}
            Reported By: ${userId}
            Reported User: ${reportedUserId}
            Timestamp: ${new Date().toISOString()}
        `);

        return res.status(200).json({
            message: "Report submitted successfully"
        });

    } catch (error) {
        //22P02 = malformed UUID in matchId or eventId
        if (error.code === '22P02') {
            return res.status(400).json({
                error: "Invalid id in request"
            });
        }
        //23505 = unique violation on (match_id, reporter_id): two reports raced
        if (error.code === '23505') {
            return res.status(409).json({
                error: "You have already reported this match"
            });
        }
        console.error('Report match error:', error);
        return res.status(500).json({
            error: "Internal Server Error. Please try again later"
        });
    }
};

//Number of mutual matches (teammates) a user has in one event.
//Takes the client so it runs inside the caller's transaction.
async function countTeammates(db, userId, eventId){
    const result = await db.query(
        "SELECT COUNT(*)::int AS count FROM matches WHERE (user1_id = $1 OR user2_id = $1) AND event_id = $2 AND user1_status = 'liked' AND user2_status = 'liked'",
        [userId, eventId]
    );
    return result.rows[0].count;
}

//Error message when this like can't be recorded because it already exists, else null
function duplicateLikeError(match, userId){
    if(match.user1_status === 'liked' && match.user2_status === 'liked'){
        return "You are already matched with this candidate";
    }
    if(match.initiated_by === userId){
        return "Cannot like the same participant twice";
    }
    return null;
}

function normalizeIds(val1, val2){
    const array = [val1, val2];
    array.sort();
    const [first, second] = array;
    return {user1: first, user2: second};
}

module.exports = {findMatch, createMatch, getMutualMatches, getPendingMatches, deleteMatch, reportMatch};