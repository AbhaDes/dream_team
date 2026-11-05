//Using a basic test to see how jest works, and then applying it to the app slowly
//signup emails a verification code; the mock captures it instead of sending it
jest.mock('../utils/emailService', () => require('./helpers/emailMock'));

//the per-IP register limit is env-configurable (generous by default); use a small
//one here so the 429 test doesn't need hundreds of requests. Read when app loads.
process.env.RATE_LIMIT_REGISTER_PER_HOUR = '20';

//all the require statements
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../app');
const pool = require('../config/database');
const emailMock = require('./helpers/emailMock');
const { registerAndLogin } = require('./helpers/auth');

//password used by the verify/resend tests' signups
const PW = '12345678';

//a 6-digit code guaranteed to differ from `code`
const wrongCode = (code) => String((Number(code) + 1) % 1_000_000).padStart(6, '0');

//unique per run so the suite can be re-run against the same database
const uniqueEmail = (name) => `${name}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

//shutdown after testing
afterAll(async() => {
    await pool.end();
});

//3. LOGOUT
describe('POST /api/auth/logout', () =>{
    //declare setCookieHeader
    let setCookieHeader;
    //register + verify (which logs in) a test user
    beforeAll(async() =>{
        const res = await registerAndLogin(request.agent(app),
            {username: "Logout Test", email: uniqueEmail('logouttest'), password: "12345678"});

        //get the cookie
        setCookieHeader = res.header['set-cookie'];
    });

    //call the endpoint with that cookie attached -- expect 200
    it('returns a 200 when session successfully deleted', async () =>{
        const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', setCookieHeader);

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({message: "Logged out of account. Login again to match!"});
        //the cleared cookie must carry the same SameSite as the session cookie
        expect(res.header['set-cookie'].join(';')).toMatch(/SameSite=Lax/i);

    });

    //call GET /auth/me using the same coookie -- expect 401
    it('returns a 401 when trying to add an expired cookie', async() => {
        const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', setCookieHeader);

        expect(res.statusCode).toBe(401)
        expect(res.body).toEqual({error: "Unauthorized login"});
    })

});

//1. LOGIN
//--the login endpoint is supposed to return the user_id, email and username, with status code 200
describe('POST /api/auth/login', () =>{
    const email = uniqueEmail('arvinddeshpande');
    beforeAll(async() =>{
        await registerAndLogin(request.agent(app),
            {username: "Arvind Deshpande", email, password: "12345678"});
    });
    //what it returns on success
    it('returns a 200 with the username, email and user_id', async () =>{
        const res = await request(app)
        .post('/api/auth/login')
        .send({email, password: "12345678"});

        expect(res.statusCode).toEqual(200)
        expect(res.body.user).toHaveProperty('user_id')
        expect(res.body).toEqual({
            user: {
                email,
                user_id: expect.any(String),
                username: "Arvind Deshpande"
            },
            message: "Logged into user account successfully!"
        });

    });

    //emails are case-insensitive and trimmed
    it('logs in with a mixed-case, padded email', async() => {
        const res = await request(app)
        .post('/api/auth/login')
        .send({email: `  ${email.toUpperCase()} `, password: "12345678"});

        expect(res.statusCode).toBe(200);
        expect(res.body.user.email).toBe(email);
    });

    //signup is open to any address, so login is too
    it('logs in with a non-school email', async() => {
        const gmail = uniqueEmail('someone').replace('@example.com', '@gmail.com');
        await registerAndLogin(request.agent(app), {username: 'Gmail User', email: gmail, password: '12345678'});

        const res = await request(app)
        .post('/api/auth/login')
        .send({email: gmail, password: '12345678'});

        expect(res.statusCode).toBe(200);
    });

    //accounts created before verification existed are grandfathered (email_verified = true)
    it('logs in a grandfathered user', async() => {
        const legacyEmail = uniqueEmail('legacy');
        await pool.query(
            'INSERT INTO users (username, email, password, email_verified) VALUES ($1, $2, $3, true)',
            ['Legacy User', legacyEmail, await bcrypt.hash('12345678', 10)]
        );

        const res = await request(app)
        .post('/api/auth/login')
        .send({email: legacyEmail, password: '12345678'});

        expect(res.statusCode).toBe(200);
    });

    //right password, unverified email: 403 and no session
    it('returns a 403 and no session when the email is not verified', async() => {
        const pendingEmail = uniqueEmail('unverified');
        await request(app).post('/api/auth/register')
            .send({username: 'Pending', email: pendingEmail, password: '12345678'});

        const agent = request.agent(app);
        const res = await agent
        .post('/api/auth/login')
        .send({email: pendingEmail, password: '12345678'});

        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({error: 'Please verify your email', needs_verification: true});
        expect(res.header['set-cookie']).toBeUndefined();

        const me = await agent.get('/api/auth/me');
        expect(me.statusCode).toBe(401);
    });

    //wrong password on an unverified account is still a plain 401
    it('returns a 401, not a 403, for a wrong password on an unverified account', async() => {
        const pendingEmail = uniqueEmail('unverified2');
        await request(app).post('/api/auth/register')
            .send({username: 'Pending', email: pendingEmail, password: '12345678'});

        const res = await request(app)
        .post('/api/auth/login')
        .send({email: pendingEmail, password: 'wrongpassword'});

        expect(res.statusCode).toBe(401);
    });

    //non-existing email or password
    it('returns 400 when the email or password is empty', async() => {
        const res = await request(app)
        .post('/api/auth/login')
        .send({email: '', password: '12345678'});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Email and password are required'});
    })

    //no JSON body at all must not crash the handler
    it('returns 400 when there is no request body', async() => {
        const res = await request(app).post('/api/auth/login');

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Email and password are required'});
    })

    it('returns 400 when the email is longer than 254 characters', async() => {
        const res = await request(app)
        .post('/api/auth/login')
        .send({email: `${'a'.repeat(250)}@example.com`, password: '12345678'});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Email must be 254 characters or fewer'});
    })

    //non existing user -- test it using a test user I know does not exist in the database
    it('returns 401 when the user not found', async() => {
        const res = await request(app)
        .post('/api/auth/login')
        .send({email: 'jlamberti@sfsu.edu', password: "12345678"});

        expect(res.statusCode).toBe(401)
        expect(res.body).toEqual({error: 'Invalid email or password'});
    })

    //adding check for invalid password
    it('returns 401 when password is invalid', async() =>{
        const res = await request(app)
        .post('/api/auth/login')
        .send({email, password: "iamarvind"});

        expect(res.statusCode).toBe(401)
        expect(res.body).toEqual({error: 'Invalid email or password'});
    })

    //adding rate limiting test -- the limiter is keyed per email, so keep
    //guessing one account's password until it locks (5 failures per 15 min)
    it('returns 429 when too many requests',async() =>{
        let lastResponse;
        for(let i = 0; i < 6; i++){
            lastResponse = await request(app)
                .post('/api/auth/login')
                .send({email:"ratelimit@sfsu.edu", password: "wrongpassword"});
        }

        expect(lastResponse.statusCode).toBe(429)
        expect(lastResponse.body).toEqual({error: 'Too many login attemps. Please try again later'});
    })

    //a locked-out account must not lock out everyone else behind the same IP
    it('still lets a different account log in after another is rate limited', async() =>{
        const res = await request(app)
            .post('/api/auth/login')
            .send({email: email.toUpperCase(), password: "12345678"});

        expect(res.statusCode).toBe(200)
    })
});

//4. VERIFY
describe('POST /api/auth/verify', () => {
    const register = (email, password = '12345678') => request(app)
        .post('/api/auth/register')
        .send({username: 'Verify Test', email, password});

    it('verifies the code, logs the user in and returns the login shape', async() => {
        const email = uniqueEmail('verifyok');
        await register(email);
        const agent = request.agent(app);

        const res = await agent.post('/api/auth/verify')
            .send({email, code: emailMock.lastCodeFor(email), password: PW});

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            user: {email, user_id: expect.any(String), username: 'Verify Test'},
            message: 'Email verified. Logged in successfully!'
        });
        const me = await agent.get('/api/auth/me');
        expect(me.statusCode).toBe(200);
    });

    it('stores only a hash of the code', async() => {
        const email = uniqueEmail('hashonly');
        await register(email);
        const row = await pool.query(
            `SELECT c.code_hash FROM email_verification_codes c
             JOIN users u ON u.user_id = c.user_id WHERE u.email = $1`, [email]);

        expect(row.rows[0].code_hash).toMatch(/^[0-9a-f]{64}$/);
        expect(row.rows[0].code_hash).not.toContain(emailMock.lastCodeFor(email));
    });

    it('accepts a code only once', async() => {
        const email = uniqueEmail('singleuse');
        await register(email);
        const code = emailMock.lastCodeFor(email);

        const first = await request(app).post('/api/auth/verify').send({email, code, password: PW});
        const second = await request(app).post('/api/auth/verify').send({email, code, password: PW});

        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(400);
        expect(second.body).toEqual({error: 'Invalid or expired code'});
    });

    it('invalidates the code after 5 wrong attempts until a new one is requested', async() => {
        const email = uniqueEmail('attempts');
        await register(email);
        const code = emailMock.lastCodeFor(email);

        for(let i = 0; i < 5; i++){
            const res = await request(app).post('/api/auth/verify').send({email, code: wrongCode(code), password: PW});
            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({error: 'Invalid or expired code'});
        }
        //the right code no longer works
        const blocked = await request(app).post('/api/auth/verify').send({email, code, password: PW});
        expect(blocked.statusCode).toBe(400);

        //a fresh code does (step past the 60s resend cooldown first)
        await pool.query(
            `UPDATE email_verification_codes SET last_sent_at = NOW() - INTERVAL '2 minutes'
             WHERE user_id = (SELECT user_id FROM users WHERE email = $1)`, [email]);
        const nextCode = emailMock.nextCodeFor(email);
        const resend = await request(app).post('/api/auth/resend-code').send({email});
        expect(resend.statusCode).toBe(200);

        const res = await request(app).post('/api/auth/verify').send({email, code: await nextCode, password: PW});
        expect(res.statusCode).toBe(200);
    });

    it('rejects an expired code', async() => {
        const email = uniqueEmail('expired');
        await register(email);
        await pool.query(
            `UPDATE email_verification_codes SET expires_at = NOW() - INTERVAL '1 second'
             WHERE user_id = (SELECT user_id FROM users WHERE email = $1)`, [email]);

        const res = await request(app).post('/api/auth/verify')
            .send({email, code: emailMock.lastCodeFor(email), password: PW});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Invalid or expired code'});
    });

    it('answers an unknown email the same as a wrong code', async() => {
        const res = await request(app).post('/api/auth/verify')
            .send({email: uniqueEmail('nobody'), code: '123456', password: PW});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Invalid or expired code'});
    });

    it('returns 400 when the code is not 6 digits, the password is missing or there is no body', async() => {
        const bad = await request(app).post('/api/auth/verify').send({email: 'a@example.com', code: '12ab', password: PW});
        const noPassword = await request(app).post('/api/auth/verify').send({email: 'a@example.com', code: '123456'});
        const none = await request(app).post('/api/auth/verify');

        for(const res of [bad, noPassword, none]){
            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({error: 'Email, password and a 6-digit code are required'});
        }
    });

    //the code alone isn't enough: whoever verifies must also know the account's password
    it('rejects the right code with the wrong password, counting it as an attempt', async() => {
        const email = uniqueEmail('wrongpw');
        await register(email);
        const code = emailMock.lastCodeFor(email);

        for(let i = 0; i < 5; i++){
            const res = await request(app).post('/api/auth/verify').send({email, code, password: 'not-the-password'});
            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({error: 'Invalid or expired code'});
        }
        //5 wrong-password tries used the code up: now even both right fails
        const res = await request(app).post('/api/auth/verify').send({email, code, password: PW});
        expect(res.statusCode).toBe(400);

        const attempts = await pool.query(
            `SELECT c.attempts, c.code_hash FROM email_verification_codes c
             JOIN users u ON u.user_id = c.user_id WHERE u.email = $1`, [email]);
        expect(attempts.rows[0].attempts).toBe(5);
        expect(attempts.rows[0].code_hash).toBeNull();
    });
});

//5. RESEND CODE
describe('POST /api/auth/resend-code', () => {
    const genericReply = {message: 'If that email is waiting for verification, a new code is on its way.'};

    it('sends a new code, then enforces the 60s cooldown', async() => {
        const email = uniqueEmail('resend');
        await request(app).post('/api/auth/register')
            .send({username: 'Resend Test', email, password: '12345678'});
        //step past the cooldown the signup email started
        await pool.query(
            `UPDATE email_verification_codes SET last_sent_at = NOW() - INTERVAL '2 minutes'
             WHERE user_id = (SELECT user_id FROM users WHERE email = $1)`, [email]);

        const nextCode = emailMock.nextCodeFor(email);
        const first = await request(app).post('/api/auth/resend-code').send({email});
        expect(first.statusCode).toBe(200);
        expect(first.body).toEqual(genericReply);
        const code = await nextCode;

        const second = await request(app).post('/api/auth/resend-code').send({email});
        expect(second.statusCode).toBe(429);
        expect(second.body).toEqual({error: 'Please wait a minute before requesting another code'});

        //the new code works
        const res = await request(app).post('/api/auth/verify').send({email, code, password: PW});
        expect(res.statusCode).toBe(200);
    });

    it('answers the same for an unknown or already verified email and sends nothing', async() => {
        const verifiedEmail = uniqueEmail('resendverified');
        await registerAndLogin(request.agent(app), {username: 'Done', email: verifiedEmail, password: '12345678'});
        const callsBefore = emailMock.sendVerificationCode.mock.calls.length;

        const unknown = await request(app).post('/api/auth/resend-code').send({email: uniqueEmail('ghost')});
        const verified = await request(app).post('/api/auth/resend-code').send({email: verifiedEmail});
        const unknownAgain = await request(app).post('/api/auth/resend-code').send({email: uniqueEmail('ghost2')});

        expect(unknown.statusCode).toBe(200);
        expect(unknown.body).toEqual(genericReply);
        expect(verified.statusCode).toBe(200);
        expect(verified.body).toEqual(genericReply);
        expect(unknownAgain.body).toEqual(genericReply);
        //give any background send a moment, then check none happened
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(emailMock.sendVerificationCode.mock.calls.length).toBe(callsBefore);
    });

    it('returns 400 without an email', async() => {
        const res = await request(app).post('/api/auth/resend-code');

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Email is required'});
    });
});

//2. SIGNUP
//--the register endpoint is supposed to create the user and return the user_id, email and username, with status code 201
describe('POST /api/auth/register', () => {
    //this block runs from its own (fake, proxy-forwarded) IP so its requests don't
    //share the per-IP register limit with the rest of the file
    const IP = '203.0.113.7';
    const register = (body) => request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', IP)
        .send(body);

    //email reserved for these tests -- deleted before and after so the run is repeatable
    const testEmail = "signuptest@sfsu.edu";

    beforeAll(async () => {
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    });

    afterAll(async () => {
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    });

    //what it returns on success
    it('returns a 201 with the username, email and user_id, and no session', async () => {
        const res = await register({username: "Signup Test", email: testEmail, password: "12345678"});

        expect(res.statusCode).toEqual(201)
        expect(res.body.user).toHaveProperty('user_id')
        expect(res.body).toEqual({
            user: {
                email: testEmail,
                user_id: expect.any(String),
                username: "Signup Test"
            },
            message: 'Account created. Check your email for a verification code.',
            needs_verification: true
        });
        //not logged in until the email is verified
        expect(res.header['set-cookie']).toBeUndefined();
        //and a code went to that address
        expect(emailMock.lastCodeFor(testEmail)).toMatch(/^\d{6}$/);

    });

    //any email domain is accepted, stored trimmed + lowercased
    it('accepts any email domain and stores it lowercased', async() => {
        const email = uniqueEmail('MixedCase').replace('@example.com', '@Gmail.COM');
        const res = await register({username: "Mixed Case", email: `  ${email} `, password: "12345678"});

        expect(res.statusCode).toBe(201);
        expect(res.body.user.email).toBe(email.toLowerCase());
    });

    //an unverified account is only a pending signup: registering again replaces it,
    //kills the code already sent, and only the new password can verify
    it('replaces a pending unverified account for the same email', async() => {
        const email = uniqueEmail('squat');
        const first = await register({username: "Squatter", email, password: "squatterpass"});
        const oldCode = emailMock.lastCodeFor(email);
        //the replacement sends a fresh code right away (no cooldown wait)
        const nextCode = emailMock.nextCodeFor(email);
        const second = await register({username: "Real Owner", email: email.toUpperCase(), password: "ownerpass1"});

        expect(second.statusCode).toBe(201);
        expect(second.body.user).toEqual({user_id: first.body.user.user_id, email, username: "Real Owner"});
        const newCode = await nextCode;

        //the code sent before the overwrite is dead, even with the current password
        const stale = await request(app).post('/api/auth/verify').send({email, code: oldCode, password: "ownerpass1"});
        expect(stale.statusCode).toBe(400);
        expect(stale.body).toEqual({error: 'Invalid or expired code'});

        //the new code with the replaced (squatter's) password fails
        const wrongPw = await request(app).post('/api/auth/verify').send({email, code: newCode, password: "squatterpass"});
        expect(wrongPw.statusCode).toBe(400);
        expect(wrongPw.body).toEqual({error: 'Invalid or expired code'});

        //the new code with the current password works
        const verify = await request(app).post('/api/auth/verify').send({email, code: newCode, password: "ownerpass1"});
        expect(verify.statusCode).toBe(200);
        expect(verify.body.user.username).toBe("Real Owner");

        const oldPass = await request(app).post('/api/auth/login').send({email, password: "squatterpass"});
        const newPass = await request(app).post('/api/auth/login').send({email, password: "ownerpass1"});
        expect(oldPass.statusCode).toBe(401);
        expect(newPass.statusCode).toBe(200);
    });

    //returns a 409 when the email belongs to a verified account
    it('returns a 409 when a verified account with the email already exists', async() => {
        await request(app).post('/api/auth/verify')
            .send({email: testEmail, code: emailMock.lastCodeFor(testEmail), password: "12345678"});

        const res = await register({username: "Signup Test", email: testEmail.toUpperCase(), password: "12345678"});

        expect(res.statusCode).toBe(409);
        expect(res.body).toEqual({error: 'An account with this email already exists'});

    });

    //returns a 400 when a field is missing
    it('returns a 400 when the username, email or password is missing', async() => {
        const res = await register({email: testEmail, password: "12345678"});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Username, email, and password are required'});

    });

    //no JSON body at all must not crash the handler
    it('returns a 400 when there is no request body', async() => {
        const res = await request(app).post('/api/auth/register').set('X-Forwarded-For', IP);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Username, email, and password are required'});
    });

    it('returns a 400 when the email is not a valid address', async() => {
        const res = await register({username: "Signup Test", email: "not-an-email", password: "12345678"});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Please enter a valid email address'});
    });

    it('returns a 400 when the email is longer than 254 characters', async() => {
        const res = await register({username: "Signup Test", email: `${'a'.repeat(250)}@example.com`, password: "12345678"});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Email must be 254 characters or fewer'});
    });

    //returns a 400 when the password is too short
    it('returns a 400 when the password is under 8 characters', async() => {
        const res = await register({username: "Signup Test", email: testEmail, password: "1234567"});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Password must be at least 8 characters'});

    });

    //bcrypt only reads 72 bytes
    it('returns a 400 when the password is over 72 bytes', async() => {
        const res = await register({username: "Signup Test", email: testEmail, password: "é".repeat(37)});

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/72 bytes/);
    });

    //adding rate limiting test -- every request counts (signups send email), 20 per hour per IP
    it('returns 429 when too many requests',async() =>{
        let lastResponse;
        for(let i = 0; i < 21; i++){
            lastResponse = await register({email: "ratelimit@sfsu.edu", password: ""});
            if(lastResponse.statusCode === 429) break;
        }

        expect(lastResponse.statusCode).toBe(429)
        expect(lastResponse.body).toEqual({error: 'Too many registration attemps. Please try again later'});
    })

});
