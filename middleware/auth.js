//imports 
//database pool 
const pool = require('../config/database');


//create the middleware function
const authMiddleware = async (req, res, next)=>{
    try{
        //check if req.session.user_exists
        //if not return 401 error
        const id = req.session.user_id;
        if(!id){
            return res.status(401).json({
                error: 'Unauthorized login'
            });
        }
        const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [id]);

        //check if the user was found in the database 
        if(result.rows.length === 0){
            return res.status(401).json({
                error: "Unauthorized login"
            });
        }
        req.user = result.rows[0];
        next();
    }catch(error){
        console.log('Authentication error: ');
        res.status(500).json({
            error: 'Failed to login to user account. Please try again later.'
        });
    }
}

//export it 
module.exports = authMiddleware;