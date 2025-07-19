// therapistRoutes.js

const express = require('express');
const router = express.Router();
const therapistController = require('../controllers/therapistController');
const { protectTherapist } = require('../middleware/authMiddleware');
const multer = require('multer');
const { therapySessionUpload, checkStorageLimit, validateTherapySessionUpload } = require('../utils/upload');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware for handling file uploads
const uploadProfileImage = upload.single('image');

// Auth routes
router.post('/login', therapistController.loginTherapist);
router.post('/register', uploadProfileImage, therapistController.registerTherapist);

// Password reset routes
router.post('/forgot-password', therapistController.forgotPassword);
router.post('/verify-otp', therapistController.verifyOTP);
router.post('/reset-password', therapistController.resetPassword);

router.route('/')
	.get(protectTherapist, therapistController.getTherapist)
	.put([protectTherapist, uploadProfileImage], therapistController.updateTherapist)
	.delete(protectTherapist, therapistController.deleteTherapist);

// Analytics endpoint
router.get('/analytics', protectTherapist, therapistController.getAnalytics);

// Fetch users created by therapist
router.route('/users')
	.get(protectTherapist, therapistController.getCreatedUsers)
	.post(protectTherapist, therapistController.registerUser);

// Fetch all exercises
router.route('/exercises')
	.get(protectTherapist, therapistController.getAllExercises)
	.post(protectTherapist,
		therapySessionUpload.fields([
			{ name: 'images', maxCount: 10 },
			{ name: 'video', maxCount: 1 }
		]),
		checkStorageLimit,
		validateTherapySessionUpload,
		therapistController.createExercise
	);

router.put('/exercises/:id', protectTherapist,
	therapySessionUpload.fields([
		{ name: 'images', maxCount: 10 },
		{ name: 'video', maxCount: 1 }
	]),
	checkStorageLimit,
	therapistController.editExercise
);

// Create a consultation entry
router.route('/consultations')
	.get(protectTherapist, therapistController.getConsultations)
	.post(protectTherapist, therapistController.createConsultation);

// Update and delete a consultation
router.route('/consultations/:id')
	.put(protectTherapist, therapistController.updateConsultation)
	.delete(protectTherapist, therapistController.deleteConsultation);

// Membership management
router.route('/membership')
	.get(protectTherapist, therapistController.getMembership)
	.put(protectTherapist, therapistController.updateMembership);

module.exports = router;