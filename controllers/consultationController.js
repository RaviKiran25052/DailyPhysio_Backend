const asyncHandler = require('express-async-handler');
const Consultation = require('../models/Consultation');
const mongoose = require('mongoose');

// @desc    Get consultation by ID with populated data
// @route   GET /api/consultations/:id
// @access  Private (Patient/Therapist)
const getConsultationByID = asyncHandler(async (req, res) => {
	const consultationId = req.params.id;

	// Validate ObjectId format
	if (!mongoose.Types.ObjectId.isValid(consultationId)) {
		res.status(400);
		throw new Error('Invalid consultation ID format');
	}

	try {
		// Find consultation and populate related data
		const consultation = await Consultation.findById(consultationId)
			.populate('therapist_id')
			.populate('patient_id')
			.populate({
				path: 'recommendedExercises',
				match: { $or: [{ 'custom.type': 'public' }] }
			})

		// Check if consultation exists
		if (!consultation) {
			res.status(404);
			throw new Error('Consultation not found');
		}

		// Check if therapist data was populated (might be null if therapist was rejected)
		if (!consultation.therapist_id) {
			res.status(404);
			throw new Error('Therapist associated with this consultation is no longer available');
		}

		// Check if patient data was populated
		if (!consultation.patient_id) {
			res.status(404);
			throw new Error('Patient associated with this consultation is no longer available');
		}

		// Check consultation expiration and update status if needed
		await consultation.checkExpiration();

		res.status(200).json({
			success: true,
			message: 'Consultation retrieved successfully',
			data: consultation
		});

	} catch (error) {
		// Handle specific mongoose/mongodb errors
		if (error.name === 'CastError') {
			res.status(400);
			throw new Error('Invalid consultation ID format');
		}

		throw error;
	}
});

module.exports = {
	getConsultationByID,
};