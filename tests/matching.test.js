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

//signup emails a verification code; the mock captures it so the helper can verify
jest.mock('../utils/emailService', () => require('./helpers/emailMock'));
const { registerAndLogin } = require('./helpers/auth');

const signUp = async (name) => {
    const agent = request.agent(app);
    const email = `match-${name}-${Date.now()}@example.com`;
    await registerAndLogin(agent, {username: name, email, password: '12345678'});
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

//The tests below create their own users so they don't depend on the state above
const setupUsers = async (names) => {
    for(const name of names){
        await signUp(name);
        await join(name, profile('Full-stack Developer'));
    }
};

const makeTeammates = async (a, b) => {
    expect((await like(a, b)).statusCode).toBe(200);
    expect((await like(b, a)).statusCode).toBe(200);
};

const teammateCount = async (name) => {
    const result = await pool.query(
        "SELECT COUNT(*)::int AS count FROM matches WHERE event_id = $1 AND (user1_id = $2 OR user2_id = $2) AND user1_status = 'liked' AND user2_status = 'liked'",
        [eventId, participants[name].user_id]
    );
    return result.rows[0].count;
};

describe('POST /api/events/:eventId/like - duplicates and limits', () => {
    beforeAll(async () => {
        await setupUsers(['dup1', 'dup2', 'cap0', 'cap1', 'cap2', 'cap3', 'cap4']);
    });

    it('returns 409 when liking the same participant twice', async () => {
        expect((await like('dup1', 'dup2')).statusCode).toBe(200);
        const res = await like('dup1', 'dup2');
        expect(res.statusCode).toBe(409);
        expect(res.body.error).toBe('Cannot like the same participant twice');
    });

    it("returns 409 when the liker's own team is full", async () => {
        for(const name of ['cap1', 'cap2', 'cap3']){
            await makeTeammates('cap0', name);
        }
        const res = await like('cap0', 'cap4');
        expect(res.statusCode).toBe(409);
        expect(res.body.error).toBe('You have already matched with 3 teammates');
    });

    it('gives a full team re-liking a teammate the duplicate error, not the limit error', async () => {
        const res = await like('cap0', 'cap1');
        expect(res.statusCode).toBe(409);
        expect(res.body.error).toBe('You are already matched with this candidate');
    });

    it('returns 400 (not 500) when the like has no body', async () => {
        const res = await agents.dup1.post(`/api/events/${eventId}/like`);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('participant_id is required');
    });
});

describe('POST /api/events/:eventId/like - concurrency', () => {
    beforeAll(async () => {
        await setupUsers([
            'hub', 'hubA', 'hubB', 'hubC', 'hubD', 'hubE',
            'liker', 'likA', 'likB', 'likC', 'likD', 'likE',
            'pairA', 'pairB'
        ]);
    });

    it('concurrent like-backs cannot push a user past 3 teammates', async () => {
        await makeTeammates('hub', 'hubA');
        await makeTeammates('hub', 'hubB');
        //hub likes three more people; they all like back at once
        for(const name of ['hubC', 'hubD', 'hubE']){
            expect((await like('hub', name)).statusCode).toBe(200);
        }
        const results = await Promise.all(['hubC', 'hubD', 'hubE'].map(name => like(name, 'hub')));
        expect(results.map(r => r.statusCode).sort()).toEqual([200, 409, 409]);
        expect(await teammateCount('hub')).toBe(3);
    });

    it("the liker's own concurrent like-backs cannot push them past 3 teammates", async () => {
        await makeTeammates('liker', 'likA');
        await makeTeammates('liker', 'likB');
        for(const name of ['likC', 'likD', 'likE']){
            expect((await like(name, 'liker')).statusCode).toBe(200);
        }
        const results = await Promise.all(['likC', 'likD', 'likE'].map(name => like('liker', name)));
        expect(results.map(r => r.statusCode).sort()).toEqual([200, 409, 409]);
        expect(await teammateCount('liker')).toBe(3);
    });

    it('simultaneous first likes end as a mutual match with no lost like', async () => {
        const [first, second] = await Promise.all([like('pairA', 'pairB'), like('pairB', 'pairA')]);
        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(200);

        const rows = await pool.query(
            'SELECT * FROM matches WHERE event_id = $1 AND (user1_id = $2 OR user2_id = $2)',
            [eventId, participants.pairA.user_id]
        );
        expect(rows.rows).toHaveLength(1);
        expect(rows.rows[0].user1_status).toBe('liked');
        expect(rows.rows[0].user2_status).toBe('liked');
    });
});

describe('Malformed ids', () => {
    beforeAll(async () => {
        await setupUsers(['badA', 'badB']);
    });

    it('returns 400 for a malformed participant_id', async () => {
        const res = await agents.badA.post(`/api/events/${eventId}/like`).send({participant_id: 'not-a-uuid'});
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Invalid id in request');
    });

    it('returns 400 for a malformed eventId on like', async () => {
        const res = await agents.badA.post('/api/events/not-a-uuid/like').send({participant_id: participants.badB.participant_id});
        expect(res.statusCode).toBe(400);
    });

    it('returns 400 when deleting a malformed matchId', async () => {
        const res = await agents.badA.delete(`/api/events/${eventId}/matches/not-a-uuid`);
        expect(res.statusCode).toBe(400);
    });

    it('returns 400 when reporting a malformed matchId', async () => {
        const res = await agents.badA
            .post(`/api/events/${eventId}/matches/not-a-uuid/report`)
            .send({reason: 'Test report'});
        expect(res.statusCode).toBe(400);
    });
});

describe('POST /api/events/:eventId/matches/:matchId/report - duplicates and logging', () => {
    let matchId;

    beforeAll(async () => {
        await setupUsers(['repA', 'repB']);
        await makeTeammates('repA', 'repB');
        const mutual = await agents.repA.get(`/api/events/${eventId}/matches/mutual`);
        matchId = mutual.body.mutual[0].match_id;
    });

    it('does not log emails or the reason', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        try {
            const res = await agents.repA
                .post(`/api/events/${eventId}/matches/${matchId}/report`)
                .send({reason: 'secret reason text'});
            expect(res.statusCode).toBe(200);
            const logged = spy.mock.calls.flat().join(' ');
            expect(logged).toContain(matchId);
            expect(logged).not.toContain('@sfsu.edu');
            expect(logged).not.toContain('secret reason text');
        } finally {
            spy.mockRestore();
        }
    });

    it('returns 409 when the same user reports the same match twice', async () => {
        const res = await agents.repA
            .post(`/api/events/${eventId}/matches/${matchId}/report`)
            .send({reason: 'Again'});
        expect(res.statusCode).toBe(409);

        const saved = await pool.query('SELECT * FROM reports WHERE match_id = $1', [matchId]);
        expect(saved.rows).toHaveLength(1);
    });

    it('two simultaneous duplicate reports yield one 200 and one 409', async () => {
        await setupUsers(['raceA', 'raceB']);
        await makeTeammates('raceA', 'raceB');
        const mutual = await agents.raceA.get(`/api/events/${eventId}/matches/mutual`);
        const raceMatchId = mutual.body.mutual[0].match_id;

        const report = () => agents.raceA
            .post(`/api/events/${eventId}/matches/${raceMatchId}/report`)
            .send({reason: 'Race report'});
        const results = await Promise.all([report(), report()]);
        expect(results.map(r => r.statusCode).sort()).toEqual([200, 409]);

        const saved = await pool.query('SELECT * FROM reports WHERE match_id = $1', [raceMatchId]);
        expect(saved.rows).toHaveLength(1);
    });

    it('still lets the other person in the match report it', async () => {
        const res = await agents.repB
            .post(`/api/events/${eventId}/matches/${matchId}/report`)
            .send({reason: 'From the other side'});
        expect(res.statusCode).toBe(200);
    });
});
