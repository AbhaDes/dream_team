const express = require ('express');
const router = express.Router();
const authController = require('../controllers/authController');

//Define route '/register'
router.post('/register', authController.register);

//Define route 'login'
router.post('/login', authController.login);

module.exports = router;