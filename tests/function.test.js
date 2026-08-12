//Using a basic test to see how jest works, and then applying it to the app slowly
//all the require statements 
const request = require('supertest');
const app = require('../app');
const pool = require('../config/database'); 

//shutdown after testing 
afterAll(async() => {
    await pool.end();
});

//3. LOGOUT
describe('POST /api/auth/logout', () =>{
    //declare setCookieHeader 
    let setCookieHeader;
    //register + login a test user
    beforeAll(async() =>{
        //register
        const regRes = await request(app)
        .post('/api/auth/register')
        .send({username: "Logout Test", email: "logouttest@sfsu.edu", password: "12345678"});

        //then login 
        const loginRes = await request(app)
        .post('/api/auth/login')
        .send({email: "logouttest@sfsu.edu", password: "12345678"});

        //get the cookie 
        setCookieHeader = loginRes.header['set-cookie'];
    });

    //call the endpoint with that cookie attached -- expect 200 
    it('returns a 200 when session successfully deleted', async () =>{
        const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', setCookieHeader);

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({message: "Logged out of account. Login again to match!"});

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
    beforeAll(async() =>{
        const res = await request(app)
        .post('/api/auth/register')
        .send({username: "Arvind Deshpande", email: "arvinddeshpande@sfsu.edu", password: "12345678"});
    });
    //what it returns on success 
    it('returns a 200 with the username, email and user_id', async () =>{
        const res = await request(app)
        .post('/api/auth/login')
        .send({username: "Arvind Deshpande", email: "arvinddeshpande@sfsu.edu", password: "12345678"});

        expect(res.statusCode).toEqual(200)
        expect(res.body.user).toHaveProperty('user_id')
        expect(res.body).toEqual({
            user: {
                email: "arvinddeshpande@sfsu.edu",
                user_id: expect.any(String),
                username: "Arvind Deshpande"
            },
            message: "Logged into user account successfully!"
        });

    });
    

    //returns a 400 on invalid email
    it('returns a 400 when the email is invalid', async() => {
        const res = await request(app)
        .post('/api/auth/login')
        .send({username: 'Test User', email: 'test@example.com', password : "12345678"});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Please enter your school email'});

    });
    //non-existing email or password
    it('returns 400 when the email or password is empty', async() => {
        const res = await request(app)
        .post('/api/auth/login')
        .send({email: '', password: '12345678'});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Email and password are required'});
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
        .post('/api/auth/login ')
        .send({email: "arvindeshpande@sfsu.edu", password: "iamarvind"});

        expect(res.statusCode).toBe(401)
        expect(res.body).toEqual({error: 'Invalid email or password'});
    })

    //adding rate limiting test 
    it('returns 429 when too many requests',async() =>{
        const requestPromises = Array.from({length: 2}).map(() =>
        request(app)
            .post('/api/auth/login')
            .send({email:"arvinddeshpande@sfsu.edu", password: "iamarvind"})
        );

        const responses = await Promise.all(requestPromises);

        const lastResponse = responses[responses.length - 1];

        

        expect(lastResponse.statusCode).toBe(429)
        expect(lastResponse.body).toEqual({error: 'Too many login attemps. Please try again later'});
    })
});

//2. SIGNUP
//--the register endpoint is supposed to create the user and return the user_id, email and username, with status code 201
describe('POST /api/auth/register', () => {
    //email reserved for these tests -- deleted before and after so the run is repeatable
    const testEmail = "signuptest@sfsu.edu";

    beforeAll(async () => {
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    });

    afterAll(async () => {
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    });

    //what it returns on success
    it('returns a 201 with the username, email and user_id', async () => {
        const res = await request(app)
        .post('/api/auth/register')
        .send({username: "Signup Test", email: testEmail, password: "12345678"});

        expect(res.statusCode).toEqual(201)
        expect(res.body.user).toHaveProperty('user_id')
        expect(res.body).toEqual({
            user: {
                email: testEmail,
                user_id: expect.any(String),
                username: "Signup Test"
            },
            message: "Account created successfully"
        });

    });

    //returns a 409 when the email is already taken -- the user was just created by the test above
    it('returns a 409 when an account with the email already exists', async() => {
        const res = await request(app)
        .post('/api/auth/register')
        .send({username: "Signup Test", email: testEmail, password: "12345678"});

        expect(res.statusCode).toBe(409);
        expect(res.body).toEqual({error: 'An account with this email already exists'});

    });

    //returns a 400 when a field is missing
    it('returns a 400 when the username, email or password is missing', async() => {
        const res = await request(app)
        .post('/api/auth/register')
        .send({email: testEmail, password: "12345678"});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Username, email, and password are required'});

    });

    //returns a 400 when the email is not a school email
    it('returns a 400 when the email is not an SFSU email', async() => {
        const res = await request(app)
        .post('/api/auth/register')
        .send({username: "Signup Test", email: "signuptest@gmail.com", password: "12345678"});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Must use an SFSU email address (@sfsu.edu)'});

    });

    //returns a 400 when the password is too short
    it('returns a 400 when the password is under 8 characters', async() => {
        const res = await request(app)
        .post('/api/auth/register')
        .send({username: "Signup Test", email: testEmail, password: "1234567"});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({error: 'Password must be at least 8 characters'});

    });
    //adding rate limiting test 
    it('returns 429 when too many requests',async() =>{
        const requestPromises = Array.from({length: 4}).map(() =>
        request(app)
            .post('/api/auth/register')
            .send({email:"arvinddeshpande@sfsu.edu", password: ""})
        );

        const responses = await Promise.all(requestPromises);
        const lastResponse = responses[responses.length - 1];

        expect(lastResponse.statusCode).toBe(429)
        expect(lastResponse.body).toEqual({error: 'Too many registration attemps. Please try again later'});
    })

});






