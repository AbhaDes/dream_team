//Test helpers for the signup -> verify flow. Needs the email mock installed in the
//test file first:
//    jest.mock('../utils/emailService', () => require('./helpers/emailMock'));
const { lastCodeFor } = require('./emailMock');

//Registers a user, reads the emailed code from the mock and verifies it (verify
//needs the password too).
//Verifying logs in, so `agent` (a supertest agent) ends up holding the session cookie.
//Returns the verify response (same shape as a login response).
const registerAndLogin = async (agent, { username, email, password }) => {
    const reg = await agent.post('/api/auth/register').send({ username, email, password });
    if (reg.statusCode !== 201) {
        throw new Error(`register failed for ${email}: ${reg.statusCode} ${JSON.stringify(reg.body)}`);
    }
    const code = lastCodeFor(email);
    const res = await agent.post('/api/auth/verify').send({ email, code, password });
    if (res.statusCode !== 200) {
        throw new Error(`verify failed for ${email}: ${res.statusCode} ${JSON.stringify(res.body)}`);
    }
    return res;
};

module.exports = { registerAndLogin };
