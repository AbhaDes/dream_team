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

//5. DELETE A MATCH (UNDO)
router.delete('/:eventId/matches/:matchId', authMiddleware, matchController.deleteMatch);

//6. REPORT A MATCH
router.post('/:eventId/matches/:matchId/report', authMiddleware, matchController.reportMatch);

module.exports = router;
