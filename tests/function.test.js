//Using a basic test to see how jest works, and then applying it to the app slowly
//all the require statements 
const request = require('supertest');
const app = require('../app');
const pool = require('../config/database'); 

//shutdown after testing 
afterAll(async() => {
    await pool.end();
});


//1. LOGIN 
//--the login endpoint is supposed to return the user_id, email and username, with status code 200
describe('POST /api/auth/login', () =>{
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
    it('returns 404 when the user not found', async() => {
        const res = await request(app)
        .post('/api/auth/login')
        .send({email: 'jlamberti@sfsu.edu', password: "12345678"});

        expect(res.statusCode).toBe(401)
        expect(res.body).toEqual({error: 'Invalid email or password'});
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

});


