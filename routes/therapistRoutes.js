// therapistRoutes.js

const express = require('express');
const router = express.Router();
const therapistController = require('../controllers/therapistController');

// Create a new therapist
router.post('/therapists', therapistController.createTherapist);

// Get all therapists
router.get('/therapists', therapistController.getAllTherapists);

// Update a therapist
router.put('/therapists/:id', therapistController.updateTherapist);

// Delete a therapist
router.delete('/therapists/:id', therapistController.deleteTherapist);

// Fetch all users
router.get('/users', therapistController.getAllUsers);

// Fetch all exercises
router.get('/exercises', therapistController.getAllExercises);

// Create a consultation entry
router.post('/consultations', therapistController.createConsultation);

module.exports = router;