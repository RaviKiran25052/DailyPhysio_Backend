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

// Analytics endpoint
router.get('/analytics', protectTherapist, therapistController.getAnalytics);

// Fetch users created by therapist
router.get('/users', protectTherapist, therapistController.getCreatedUsers);

// Fetch all exercises
router.get('/exercises', protectTherapist, therapistController.getAllExercises);

// Create a consultation entry
router.route('/consultations')
	.get(protectTherapist, therapistController.getConsultations)
	.post(protectTherapist, therapistController.createConsultation);

// Update and delete a consultation
router.route('/consultations/:id')
	.put(protectTherapist, therapistController.updateConsultation)
	.delete(protectTherapist, therapistController.deleteConsultation);

module.exports = router;