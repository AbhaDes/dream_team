//End-to-end tests for joining an event and the like/match flow.
//The embedding service isn't running in tests, so matching uses the rule-based fallback.
const request = require('supertest');
const app = require('../app');
const pool = require('../config/database');

let eventId;
let otherEventId;
//one logged-in agent (keeps its session cookie) per test user
const agents = {};
const participants = {};

const profile = (role, extra = {}) => ({
    role,
    experience: 'Intermediate',
    availability: 'Part Time (10-20 hours)',
    skills: ['JavaScript'],
    ...extra
});

const signUp = async (name) => {
    const agent = request.agent(app);
    const email = `match-${name}-${Date.now()}@sfsu.edu`;
    await agent.post('/api/auth/register').send({username: name, email, password: '12345678'});
    await agent.post('/api/auth/login').send({email, password: '12345678'});
    agents[name] = agent;
    return agent;
};

const join = async (name, body, event = eventId) => {
    const res = await agents[name].post(`/api/events/${event}/join`).send(body);
    if(res.statusCode === 200){
        participants[name] = res.body.event_participant;
    }
    return res;
};

const like = (name, target, event = eventId) =>
    agents[name].post(`/api/events/${event}/like`).send({participant_id: participants[target].participant_id});

beforeAll(async () => {
    const e1 = await pool.query("INSERT INTO events(event_name, event_date) VALUES ('Match Test', CURRENT_DATE) RETURNING event_id");
    const e2 = await pool.query("INSERT INTO events(event_name, event_date) VALUES ('Other Event', CURRENT_DATE) RETURNING event_id");
    eventId = e1.rows[0].event_id;
    otherEventId = e2.rows[0].event_id;
    for(const name of ['ana', 'ben', 'cal', 'dee', 'eve', 'fay']){
        await signUp(name);
    }
});

afterAll(async () => {
    await pool.end();
});

describe('POST /api/events/:eventId/join', () => {
    it('lets a user join without a bio', async () => {
        const res = await join('ana', profile('Frontend Developer'));
        expect(res.statusCode).toBe(200);
    });

    it('returns 400 (not 500) for a bio over 300 characters', async () => {
        const res = await join('ben', profile('Backend Developer', {bio: 'x'.repeat(301)}));
        expect(res.statusCode).toBe(400);
    });

    it('returns 400 (not 500) for a role that is not in the list', async () => {
        const res = await join('ben', profile('Wizard'));
        expect(res.statusCode).toBe(400);
    });

    it('returns 409 when two joins race', async () => {
        const [first, second] = await Promise.all([
            join('ben', profile('Backend Developer')),
            join('ben', profile('Backend Developer'))
        ]);
        expect([first.statusCode, second.statusCode].sort()).toEqual([200, 409]);
    });
});

describe('POST /api/events/:eventId/like', () => {
    beforeAll(async () => {
        for(const name of ['cal', 'dee', 'eve', 'fay']){
            await join(name, profile('Full-stack Developer'));
        }
    });

    it('does not let a user like themselves', async () => {
        const res = await like('ana', 'ana');
        expect(res.statusCode).toBe(400);
    });

    it('returns 403 when liking in an event the user has not joined', async () => {
        const res = await like('ana', 'ben', otherEventId);
        expect(res.statusCode).toBe(403);
    });

    it('creates a mutual match when both people like each other', async () => {
        expect((await like('ana', 'ben')).statusCode).toBe(200);
        const res = await like('ben', 'ana');
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('You are now matched with this candidate');
    });

    it('only returns mutual matches for the requested event', async () => {
        const res = await agents.ana.get(`/api/events/${eventId}/matches/mutual`);
        expect(res.body.mutual).toHaveLength(1);

        const other = await agents.ana.get(`/api/events/${otherEventId}/matches/mutual`);
        expect(other.body.mutual).toHaveLength(0);
    });

    it("blocks a like-back that would push the other person's team past 3", async () => {
        //ana fills her team: ben (above), cal, dee
        for(const name of ['cal', 'dee']){
            await like('ana', name);
            await like(name, 'ana');
        }
        //eve likes ana first; ana's team is full, so ana can't like back
        await like('eve', 'ana');
        const res = await like('ana', 'eve');
        expect(res.statusCode).toBe(409);

        //fay liking ana first, then ana liking back, is blocked the same way
        await like('fay', 'ana');
        expect((await like('ana', 'fay')).statusCode).toBe(409);

        const teammates = await pool.query(
            "SELECT COUNT(*)::int AS count FROM matches WHERE event_id = $1 AND (user1_id = $2 OR user2_id = $2) AND user1_status = 'liked' AND user2_status = 'liked'",
            [eventId, participants.ana.user_id]
        );
        expect(teammates.rows[0].count).toBe(3);
    });
});

describe('POST /api/events/:eventId/matches/:matchId/report', () => {
    it('saves the report', async () => {
        const mutual = await agents.ben.get(`/api/events/${eventId}/matches/mutual`);
        const matchId = mutual.body.mutual[0].match_id;

        const res = await agents.ben
            .post(`/api/events/${eventId}/matches/${matchId}/report`)
            .send({reason: 'Test report'});
        expect(res.statusCode).toBe(200);

        const saved = await pool.query('SELECT * FROM reports WHERE match_id = $1', [matchId]);
        expect(saved.rows).toHaveLength(1);
        expect(saved.rows[0].reported_user_id).toBe(participants.ana.user_id);
    });
});
