const express = require ('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const limiter = require('../middleware/rateLimiter');


//USER REGISTRATION ENPOINTS
//Define route '/register'
router.post('/register', limiter.registerLimiter, authController.register);

//Define route 'login'
router.post('/login', limiter.loginIpLimiter, limiter.loginLimiter, authController.login);

//EMAIL VERIFICATION ENDPOINTS
//Define route 'verify' -- checks the emailed code and logs the user in
router.post('/verify', limiter.verifyLimiter, authController.verify);

//Define route 'resend-code' -- emails a fresh code
router.post('/resend-code', limiter.resendIpLimiter, limiter.resendCooldownLimiter, limiter.resendHourlyLimiter, authController.resendCode);

//Define route "me"
router.get('/me', authMiddleware, authController.me);

//logout endpoint
router.post('/logout',authMiddleware, authController.logout);

module.exports = router;