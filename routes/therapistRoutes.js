// therapistRoutes.js

const express = require('express');
const router = express.Router();
const therapistController = require('../controllers/therapistController');
const { isTherapist } = require('../middleware/authMiddleware');

router.post('/login', therapistController.loginTherapist);
router.post('/register', therapistController.registerTherapist);

router.route('/')
	.get(isTherapist, therapistController.getTherapist)
	.put(isTherapist, therapistController.updateTherapist)
	.delete(isTherapist, therapistController.deleteTherapist);

// Fetch all users
router.get('/users', isTherapist, therapistController.getAllUsers);

// Fetch all exercises
router.get('/exercises', isTherapist, therapistController.getAllExercises);

// Create a consultation entry
router.route('/consultations')
	.get(isTherapist, therapistController.getConsultations)
	.post(isTherapist, therapistController.createConsultation);

module.exports = router;