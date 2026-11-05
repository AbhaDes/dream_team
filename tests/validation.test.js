//malformed ids in the URL should get a 400, not a Postgres 500
const request = require('supertest');
const app = require('../app');
const pool = require('../config/database');

const GOOD_ID = '984fe278-f734-4222-a614-5a5f19f3d798';

//signup emails a verification code; the mock captures it so the helper can verify
jest.mock('../utils/emailService', () => require('./helpers/emailMock'));
const { registerAndLogin: registerVerifyAndLogin } = require('./helpers/auth');

//registers + verifies + logs in; returns the session cookie
const registerAndLogin = async (email) => {
    const res = await registerVerifyAndLogin(request.agent(app), {username: 'Validation Test', email, password: '12345678'});
    return res.header['set-cookie'];
};

let cookie;

beforeAll(async () => {
    cookie = await registerAndLogin(`validationtest-${Date.now()}@example.com`);
});

afterAll(async () => {
    await pool.end();
});

describe('malformed ids return 400', () => {
    it('rejects a bad eventId', async () => {
        const res = await request(app).get('/api/events/not-a-uuid/participants/me').set('Cookie', cookie);
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Invalid eventId'});
    });

    it('rejects a bad eventId on the matches routes', async () => {
        const res = await request(app).get('/api/events/123/matches').set('Cookie', cookie);
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Invalid eventId'});
    });

    it('rejects a bad participantId', async () => {
        const res = await request(app).get(`/api/events/${GOOD_ID}/participants/abc`).set('Cookie', cookie);
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Invalid participantId'});
    });

    it('rejects a bad matchId on delete', async () => {
        const res = await request(app).delete(`/api/events/${GOOD_ID}/matches/xyz`).set('Cookie', cookie);
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Invalid matchId'});
    });

    it('rejects a bad matchId on report', async () => {
        const res = await request(app).post(`/api/events/${GOOD_ID}/matches/xyz/report`).set('Cookie', cookie).send({reason: 'x'});
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Invalid matchId'});
    });

    it('lets well-formed ids through to the handler', async () => {
        const res = await request(app).get(`/api/events/${GOOD_ID}/participants/${GOOD_ID}`).set('Cookie', cookie);
        expect(res.statusCode).not.toBe(400);
    });
});
