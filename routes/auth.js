const express = require ('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');


//USER REGISTRATION ENPOINTS
//Define route '/register'
router.post('/register', authController.register);

//Define route 'login'
router.post('/login', authController.login);

//Define route "me"
router.get('/me', authMiddleware, authController.me);

module.exports = router;