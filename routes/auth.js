const express = require ('express');
const router = express.Router();
const authController = require('../controllers/authController');

//Define route 
router.post('/register', authController.register);

module.exports = router;