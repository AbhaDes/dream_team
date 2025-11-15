//import the user pool from database.js
const { isValidElement } = require('react');
const pool = require('../config/database');
//import bcrypt for use
const bcrypt = require ('bcrypt');

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

module.exports = {register};
