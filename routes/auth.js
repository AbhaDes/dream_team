const express = require ('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const limiter = require('../middleware/rateLimiter');


//USER REGISTRATION ENPOINTS
//Define route '/register'
router.post('/register', limiter.registerLimiter, authController.register);

//Define route 'login'
router.post('/login', limiter.loginLimiter, authController.login);

//Define route "me"
router.get('/me', authMiddleware, authController.me);

//logout endpoint
router.post('/logout',authMiddleware, authController.logout);

module.exports = router;