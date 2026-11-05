//Rejects malformed ids with a 400 before they reach Postgres (a non-UUID in a
//UUID column throws and used to surface as a 500).
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validateUuidParam = (name) => (req, res, next, value) => {
    if(!UUID_REGEX.test(value)){
        return res.status(400).json({ error: `Invalid ${name}` });
    }
    next();
};

//registers the id checks on a router
//(participantId may also be the literal "me" -- but that route is matched
//before /:participantId, so it never reaches the param handler)
const validateIds = (router) => {
    ['eventId', 'participantId', 'matchId'].forEach(name => {
        router.param(name, validateUuidParam(name));
    });
};

module.exports = validateIds;
