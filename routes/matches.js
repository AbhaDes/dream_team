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

//2. CREATES THE MATCH 
router.post('/:eventId/like', authMiddleware, matchController.createMatch);

//3. GIVES MUTUAL MATCHES 
router.get('/:eventId/matches/mutual', authMiddleware, matchController.getMutualMatches);

//4. GIVES PENDING MATCHES
router.get('/:eventId/matches/pending', authMiddleware, matchController.getPendingMatches);

module.exports = router;
