const express = require('express');
const router = express.Router();
const validateIds = require('../middleware/validateIds');
validateIds(router);
const authMiddleware = require('../middleware/auth');
const eventController = require('../controllers/eventController');

//EVENT HANDLING ROUTES
//1. Joining an event
router.post('/:eventId/join', authMiddleware, eventController.joinEvent);

//2. Getting my own profile
router.get('/:eventId/participants/me', authMiddleware, eventController.getMe);

//3. Getting the participant profile
router.get('/:eventId/participants/:participantId', authMiddleware, eventController.getParticipant);

//4. Updating my own profile 
router.put('/:eventId/participants/me', authMiddleware, eventController.updateProfile );

module.exports = router;