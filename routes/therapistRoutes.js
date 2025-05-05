// therapistRoutes.js

const express = require('express');
const router = express.Router();
const therapistController = require('../controllers/therapistController');
const { protectTherapist } = require('../middleware/authMiddleware');

router.post('/login', therapistController.loginTherapist);
router.post('/register', therapistController.registerTherapist);

router.route('/')
	.get(protectTherapist, therapistController.getTherapist)
	.put(protectTherapist, therapistController.updateTherapist)
	.delete(protectTherapist, therapistController.deleteTherapist);

// Fetch all users
router.get('/users', protectTherapist, therapistController.getAllUsers);

// Fetch all exercises
router.get('/exercises', protectTherapist, therapistController.getAllExercises);

// Create a consultation entry
router.route('/consultations')
	.get(protectTherapist, therapistController.getConsultations)
	.post(protectTherapist, therapistController.createConsultation);

module.exports = router;