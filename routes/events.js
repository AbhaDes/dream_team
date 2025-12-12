const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const eventController = require('../controllers/eventController');
const { route } = require('./auth');

//EVENT HANDLING ROUTES
//1. Joining an event
router.post('/:eventId/join', authMiddleware, eventController.joinEvent);

//2. Getting Participant Profile 
router.get('/:eventId/participants/:participantId', authMiddleware, eventController.getParticipant);

//3. Getting my own profile 
router.get('/:eventId/participants/me', authMiddleware, eventController.getMe);

//4. Updating my own profile 
router.put('/:eventId/participants/me', authMiddleware, eventController.updateProfile );

module.exports = router;