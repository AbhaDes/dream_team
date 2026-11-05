//import the user pool from database.js
const pool = require('../config/database');
//import bcrypt for use
const bcrypt = require ('bcrypt');
const crypto = require('crypto');
const { sendVerificationCode } = require('../utils/emailService');

//verification code rules
const CODE_TTL_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 5;
//longest address SMTP allows
const MAX_EMAIL_LENGTH = 254;

//Emails are case-insensitive: "Foo@Example.com" and "foo@example.com" are one account.
//Returns null for anything that isn't a string so string methods can't throw.
const normalizeEmail = (email) => typeof email === 'string' ? email.trim().toLowerCase() : null;

//Compared against when the email isn't registered, so a login for an unknown
//account takes as long as one with a wrong password (no account enumeration by timing).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dream-team-timing-dummy-password', 10);

//Only a keyed hash of the code is stored. The user_id is mixed in so a hash
//can't be replayed against another account; SESSION_SECRET is the pepper.
const hashCode = (userId, code) => crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(`${userId}:${code}`)
    .digest('hex');

//public part of a user row -- the same shape for register, login and verify
const publicUser = (user) => ({
    user_id: user.user_id,
    email: user.email,
    username: user.username
});

const issueVerificationCode = async (user, { ignoreCooldown = false } = {}) => {
    // 1. Six random digits, zero-padded
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    // 2. Store only its hash. The WHERE on the upsert enforces the cooldown and the
    //    hourly cap atomically, so two parallel requests can't both send.
    const result = await pool.query(
        `INSERT INTO email_verification_codes
            (user_id, code_hash, expires_at, attempts, last_sent_at, send_count, send_window_start)
         VALUES ($1, $2, NOW() + $3 * INTERVAL '1 minute', 0, NOW(), 1, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
            code_hash = EXCLUDED.code_hash,
            expires_at = EXCLUDED.expires_at,
            attempts = 0,
            last_sent_at = NOW(),
            send_count = CASE WHEN email_verification_codes.send_window_start > NOW() - INTERVAL '1 hour'
                THEN email_verification_codes.send_count + 1 ELSE 1 END,
            send_window_start = CASE WHEN email_verification_codes.send_window_start > NOW() - INTERVAL '1 hour'
                THEN email_verification_codes.send_window_start ELSE NOW() END
         WHERE (email_verification_codes.last_sent_at IS NULL
                OR email_verification_codes.last_sent_at <= NOW() - $4 * INTERVAL '1 second')
           AND NOT (email_verification_codes.send_window_start > NOW() - INTERVAL '1 hour'
                AND email_verification_codes.send_count >= $5)
         RETURNING user_id`,
        [user.user_id, hashCode(user.user_id, code), CODE_TTL_MINUTES, ignoreCooldown ? 0 : RESEND_COOLDOWN_SECONDS, MAX_SENDS_PER_HOUR]
    );
    if (result.rows.length === 0) {
        return false;
    }
    // 3. Send it. If that fails, drop the unsent code and give the cooldown back
    try {
        await sendVerificationCode({ to: user.email, code, userId: user.user_id });
    } catch (error) {
        await pool.query(
            `UPDATE email_verification_codes
             SET code_hash = NULL, last_sent_at = NULL, send_count = GREATEST(send_count - 1, 0)
             WHERE user_id = $1`,
            [user.user_id]
        );
        throw error;
    }
    return true;
};

//Logs the user in: a fresh session id (so a pre-login session id can't be reused --
//session fixation), then the user_id, saved before the response goes out.
const startSession = async (req, userId) => {
    await new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
            if(err) reject(err);
            else resolve();
        });
    });
    req.session.user_id = userId;

    await new Promise((resolve, reject) => {
        req.session.save((err) => {
            if(err) reject(err);
            else resolve();
        });
    });
};

//establishing registration logic
const register = async (req, res) => {
    try {
        // 1. Get data (a request without a JSON body has no req.body)
        const body = req.body ?? {};
        const { username, password } = body;
        const email = normalizeEmail(body.email);
        // 2. Validate fields
        if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password || !email) {
            return res.status(400).json({
                error: 'Username, email, and password are required'
            });
        }
        // 3. Validate email
        if (email.length > MAX_EMAIL_LENGTH) {
            return res.status(400).json({
                error: 'Email must be 254 characters or fewer'
            });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                error: 'Please enter a valid email address'
            });
        }
        // 4. Validate password
        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters'
            });
        }
        // bcrypt silently ignores everything past 72 bytes, so reject longer passwords
        if (Buffer.byteLength(password) > 72) {
            return res.status(400).json({
                error: 'Password must be 72 bytes or fewer (emoji and accented letters count as more than one)'
            });
        }
        if (username.trim().length > 100) {
            return res.status(400).json({
                error: 'Username must be 100 characters or fewer'
            });
        }
        // 5. Check database (AFTER validation!)
        const checkResult = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        const existing = checkResult.rows[0];
        if (existing && existing.email_verified) {
            return res.status(409).json({
                error: 'An account with this email already exists'
            });
        }
        // 6. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        // 7. Save the account. An unverified account for this email is only a pending
        //    signup -- whoever owns the inbox can take it over, so nobody can squat
        //    someone else's address by registering it first. Any code already sent is
        //    invalidated in the same statement, and verifying needs the password too,
        //    so a code from the inbox can only ever confirm the inbox owner's password.
        let newUser;
        if (existing) {
            const updateResult = await pool.query(
                `WITH invalidated AS (
                    UPDATE email_verification_codes SET code_hash = NULL WHERE user_id = $3
                 )
                 UPDATE users SET username = $1, password = $2
                 WHERE user_id = $3 AND email_verified = false RETURNING *`,
                [username.trim(), hashedPassword, existing.user_id]
            );
            if (updateResult.rows.length === 0) {
                //verified in the meantime
                return res.status(409).json({
                    error: 'An account with this email already exists'
                });
            }
            newUser = updateResult.rows[0];
        } else {
            const insertResult = await pool.query(
                'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
                [username.trim(), email, hashedPassword]
            );
            newUser = insertResult.rows[0];
        }
        // 8. Email a verification code (skipped quietly inside the resend cooldown --
        //    except after replacing a pending account, whose old code is now dead)
        try {
            await issueVerificationCode(newUser, { ignoreCooldown: !!existing });
        } catch (error) {
            console.error('Verification email error:', error.message);
            return res.status(500).json({
                error: 'Could not send the verification email. Please try again later.'
            });
        }
        // 9. Return success -- no session until the email is verified
        return res.status(201).json({
            user: publicUser(newUser),
            message: 'Account created. Check your email for a verification code.',
            needs_verification: true
        });
    } catch (error) {
        // 23505 = unique violation: two registrations for one email raced past the check
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'An account with this email already exists'
            });
        }
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Failed to create account. Please try again.'
        });
    }
};

//login logic
const login = async (req, res)=>{
   try{
       //1. Get data from req block (a request without a JSON body has no req.body)
       const body = req.body ?? {};
       const { password } = body;
       const email = normalizeEmail(body.email);
       //2. Check if any feilds are missing
       if(!email || typeof password !== 'string' || !password){
           return res.status(400).json({
               error: 'Email and password are required'
           });
       }
       //3. Reject emails no account can have
       if(email.length > MAX_EMAIL_LENGTH){
            return res.status(400).json({
                error: 'Email must be 254 characters or fewer'
            });
       }

       //4. Look the user up
       const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
       const user = result.rows[0];

       //5. Check the password -- against a dummy hash when there's no such user,
       //   so both cases take the same time
       const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_PASSWORD_HASH);

       //6. Unknown email or wrong password: same 401 either way
       if(!user || !isMatch){
           return res.status(401).json({
               error: 'Invalid email or password'
           });
       }
       //7. Right password but the email isn't verified yet: no session
       if(!user.email_verified){
           return res.status(403).json({
               error: 'Please verify your email',
               needs_verification: true
           });
       }
       //8. Log in
       await startSession(req, user.user_id);

       return res.status(200).json({
           user: publicUser(user),
           message: 'Logged into user account successfully!'
       });

   }catch(error){
       console.error('login error: ',error );
       res.status(500).json({
           error: 'Failed to login to user account. Please try again later.'
       });
   }
}

//verify email endpoint: checks the 6-digit code AND the account's password, then logs
//the user in. Needing the password means a code from the inbox can only confirm the
//password its owner chose -- not one an attacker set by re-registering the address.
const verify = async (req, res) => {
    let client;
    try{
        //1. Get data
        const body = req.body ?? {};
        const email = normalizeEmail(body.email);
        const code = typeof body.code === 'string' ? body.code.trim() : '';
        const { password } = body;
        //2. Validate fields
        if(!email || typeof password !== 'string' || !password || !/^\d{6}$/.test(code)){
            return res.status(400).json({
                error: 'Email, password and a 6-digit code are required'
            });
        }
        if(email.length > MAX_EMAIL_LENGTH){
            return res.status(400).json({
                error: 'Email must be 254 characters or fewer'
            });
        }
        //3. Count the attempt up front (atomically), and only while the code is
        //   still live: not used, not expired, fewer than 5 tries.
        //   A wrong password counts as an attempt too.
        const result = await pool.query(
            `UPDATE email_verification_codes c SET attempts = c.attempts + 1
             FROM users u
             WHERE c.user_id = u.user_id AND u.email = $1 AND u.email_verified = false
               AND c.code_hash IS NOT NULL AND c.expires_at > NOW() AND c.attempts < $2
             RETURNING c.user_id, c.code_hash, c.attempts, u.password`,
            [email, MAX_CODE_ATTEMPTS]
        );
        //one message for every failure, so it doesn't reveal which emails have accounts
        const invalid = () => res.status(400).json({
            error: 'Invalid or expired code'
        });
        const stored = result.rows[0];
        //4. Check the password (against a dummy hash when there's no live code, so
        //   every failure takes about as long), then the code in constant time
        const passwordMatch = await bcrypt.compare(password, stored ? stored.password : DUMMY_PASSWORD_HASH);
        if(!stored){
            return invalid();
        }
        const codeMatch = crypto.timingSafeEqual(
            Buffer.from(stored.code_hash, 'hex'),
            Buffer.from(hashCode(stored.user_id, code), 'hex')
        );
        if(!passwordMatch || !codeMatch){
            //5th wrong try: kill the code, the user has to request a new one
            if(stored.attempts >= MAX_CODE_ATTEMPTS){
                await pool.query(
                    'UPDATE email_verification_codes SET code_hash = NULL WHERE user_id = $1 AND code_hash = $2',
                    [stored.user_id, stored.code_hash]
                );
            }
            return invalid();
        }
        //5. Use the code up and mark the email verified, together -- only if neither
        //   the code nor the password changed since we checked them
        client = await pool.connect();
        await client.query('BEGIN');
        const used = await client.query(
            'DELETE FROM email_verification_codes WHERE user_id = $1 AND code_hash = $2 RETURNING user_id',
            [stored.user_id, stored.code_hash]
        );
        const userResult = used.rows.length === 0 ? { rows: [] } : await client.query(
            'UPDATE users SET email_verified = true WHERE user_id = $1 AND password = $2 RETURNING *',
            [stored.user_id, stored.password]
        );
        if(userResult.rows.length === 0){
            //a parallel request used the code, or the pending signup was replaced
            await client.query('ROLLBACK');
            return invalid();
        }
        await client.query('COMMIT');
        const user = userResult.rows[0];
        //6. Log in
        await startSession(req, user.user_id);

        return res.status(200).json({
            user: publicUser(user),
            message: 'Email verified. Logged in successfully!'
        });
    }catch(error){
        if(client){
            await client.query('ROLLBACK').catch(() => {});
        }
        console.error('verify error: ', error);
        res.status(500).json({
            error: 'Failed to verify email. Please try again later.'
        });
    }finally{
        if(client){
            client.release();
        }
    }
}

//resend code endpoint: always answers the same, whether or not the account exists
const resendCode = async (req, res) => {
    try{
        //1. Get data
        const body = req.body ?? {};
        const email = normalizeEmail(body.email);
        //2. Validate fields
        if(!email){
            return res.status(400).json({
                error: 'Email is required'
            });
        }
        if(email.length > MAX_EMAIL_LENGTH){
            return res.status(400).json({
                error: 'Email must be 254 characters or fewer'
            });
        }
        //3. Only unverified accounts get a code
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND email_verified = false',
            [email]
        );
        //4. Send without waiting, so the response time doesn't reveal whether
        //   an email went out
        if(result.rows.length > 0){
            issueVerificationCode(result.rows[0]).catch((error) => {
                console.error('Verification email error:', error.message);
            });
        }
        return res.status(200).json({
            message: 'If that email is waiting for verification, a new code is on its way.'
        });
    }catch(error){
        console.error('resend code error: ', error);
        res.status(500).json({
            error: 'Failed to send a new code. Please try again later.'
        });
    }
}

//logout endpoint
const logout = async (req, res) => {
    //call req.destroy with a callback
    //in that callback call res.clearCookie() with the cookie name and then send a response
    try{
        req.session.destroy((err) =>{
            if(err){
                console.error('Session destruction failed: ', err);
                return res.status(500).json({
                    error: "Could not destroy session."
                });
            }

            //must match the session cookie's attributes (SameSite=Lax everywhere)
            res.clearCookie('connect.sid', {
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production'

            }); //cleaning up the client cookie

            //sending a success response
            return res.status(200).json({
                message: "Logged out of account. Login again to match!"
            });
        });



    }catch(error){
        console.log('Get user error: ', error);
        res.status(500).json({
            error: 'Failed to logout. Please try again later.'
        })

    }
}
//Getting my own profile on the website
const me = async(req, res, next)=>{
    try{
        return res.status(200).json({
            user: {
                user_id : req.user.user_id,
                email: req.user.email,
                username : req.user.username,
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

module.exports = {register, login, verify, resendCode, logout, me};
