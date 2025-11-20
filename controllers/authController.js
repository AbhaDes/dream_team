//import the user pool from database.js
const { CURRENT_EVENT_ID } = require('../config/constants');
const pool = require('../config/database');
//import bcrypt for use
const bcrypt = require ('bcrypt');
const eventid = CURRENT_EVENT_ID;

//establishing registration logic 
const register = async (req, res) => {
    try {
        // 1. Get data
        const { username, email, password } = req.body;
        
        // 2. Validate fields
        if (!username || !password || !email) {
            return res.status(400).json({
                error: 'Username, email, and password are required'
            });
        }
        
        // 3. Validate SFSU email
        if (!email.endsWith('@sfsu.edu')) {
            return res.status(400).json({
                error: 'Must use an SFSU email address (@sfsu.edu)'
            });
        }
        
        // 4. Validate password
        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters'
            });
        }
        
        // 5. Check database (AFTER validation!)
        const checkResult = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        if (checkResult.rows.length > 0) {
            return res.status(409).json({
                error: 'An account with this email already exists'
            });
        }
        
        // 6. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 7. Insert into database
        const insertResult = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
            [username, email, hashedPassword]
        );
        
        const newUser = insertResult.rows[0];
        
        // 8. Return success
        return res.status(201).json({
            user: {
                user_id: newUser.user_id,
                email: newUser.email,
                username: newUser.username
            },
            message: 'Account created successfully'
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            error: 'Failed to create account. Please try again.' 
        });
    }
};

//login logic
const login = async (req, res)=>{

    try{
        //1. Get data from req block 
        const {email, password } = req.body;
        //2. Check if any feilds are missing 
        if(!email || !password){
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }
        //4.First check if the user exists in the database
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
        if(result.rows.length === 0){
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }
        //5. If exists, then give it a variable
        const user = result.rows[0];
        //6. Check if the password matches
        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch){
            return res.status(401).json({
                error: 'Invalid email or password'
            })
        }
        req.session.userId = user.user_id;
        return res.status(200).json({
            user:{
                user_id : user.user_id,
                email: user.email,
                username : user.username
            },
            message: 'Logged into user account successfully!'     
        });
        
    }catch(error){
        console.error('login error: ',error );
        res.status(500).json({
            error: 'Failed to login to user account. Please try again later.'
        });
    }
}

//Getting my own profile on the website 
const me = async(req, res, next)=>{
    try{
        return res.status(200).json({
            user: {
                user_id : req.user.user_id,
                email: req.user.email,
                name : req.user.username
            }
        });

    }catch(error){
        console.log('Get user error: ', error);
        res.status(500).json({
            error: 'Failed to get user. Please try again later.'
        });
    }

}

module.exports = {register,login, me};

