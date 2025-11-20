const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

//EVENT HANDLING ROUTES
//1. Joining an event