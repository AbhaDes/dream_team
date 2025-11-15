const express = require ('express');
const router = express.Router();
const authController = require('../controllers/authController');

//Define route 
router.post('/api/auth/register', authController.register);

module.exports = router;