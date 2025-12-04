//IMPORT EXPRESS ROUTER
const express = require('express');
const router = express.Router();
//IMPORT AUTHMIDDLEWARE
const authMiddleware = require('../middleware/auth');
//IMPORT MATCHCONTROLLER 
const matchController = require('../controllers/matchController');

//MATCHING ENDPOINTS

//1. GET TOP 10 MATCHES 
router.get('/:eventId/matches', authMiddleware, matchController.findMatch );

module.exports = router;
