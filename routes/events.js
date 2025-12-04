const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const eventController = require('../controllers/eventController');

//EVENT HANDLING ROUTES
//1. Joining an event
router.post('/:eventId/join', authMiddleware, eventController.joinEvent);

//2. Getting Participant Profile 
router.get('/:eventId/participants/:participantId', authMiddleware, eventController.getParticipant);

module.exports = router;