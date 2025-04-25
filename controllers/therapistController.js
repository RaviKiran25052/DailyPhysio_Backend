// therapistController.js

const Therapist = require('../models/Therapist');
const User = require('../models/userModel');
const Exercise = require('../models/exerciseModel');
const Consultation = require('../models/Consultation');
const generateToken = require('../utils/generateToken');

// Create a new therapist
exports.registerTherapist = async (req, res) => {
    try {
        const therapist = new Therapist(req.body);
        await therapist.save();
        if (therapist) {
            res.status(201).json({
                _id: therapist._id,
                name: therapist.name,
                email: therapist.email,
                token: generateToken(therapist._id),
            });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.loginTherapist = async (req, res) => {
    const { email, password } = req.body;

    const therapist = await Therapist.findOne({ email });

    if (therapist && (await therapist.matchPassword(password))) {
        res.status(200).json({
            _id: therapist._id,
            name: therapist.name,
            email: therapist.email,
            token: generateToken(therapist._id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
};

// Get therapists
exports.getTherapist = async (req, res) => {
    try {
        const therapists = await Therapist.find(req.therapist._id);
        res.status(200).json(therapists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a therapist
exports.updateTherapist = async (req, res) => {
    try {
        const therapist = await Therapist.findByIdAndUpdate(req.therapist._id, req.body, { new: true });
        if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
        res.status(200).json(therapist);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a therapist
exports.deleteTherapist = async (req, res) => {
    try {
        const therapist = await Therapist.findByIdAndDelete(req.therapist._id);
        if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Fetch all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Fetch all exercises
exports.getAllExercises = async (req, res) => {
    try {
        const exercises = await Exercise.find();
        res.status(200).json(exercises);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Fetch all consultations
exports.getConsultations = async (req, res) => {
    try {
        const consultations = await Consultation.find({ therapist_id: req.therapist._id });
        res.status(200).json(consultations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a consultation entry
exports.createConsultation = async (req, res) => {
    try {
        const { therapistId, userId, exercises = [], activeDays = 30, desp = '' } = req.body;

        if (!therapistId || !userId) {
            return res.status(400).json({ message: "Therapist ID and User ID are required." });
        }

        const consultation = new Consultation({
            therapist_id: therapistId,
            patient_id: userId,
            recommendedExercises: exercises,
            request: { activeDays },
            notes: desp.trim()
        });

        await consultation.save();

        // Optionally activate consultation upon creation
        await consultation.activateConsultation(activeDays);

        res.status(201).json(consultation);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Activate a consultation by ID
exports.activateConsultation = async (req, res) => {
    try {
        const { id } = req.params;
        const { activeDays = 30 } = req.body;

        const consultation = await Consultation.findById(id);
        if (!consultation) {
            return res.status(404).json({ message: "Consultation not found." });
        }

        await consultation.activateConsultation(activeDays);
        res.status(200).json({ message: "Consultation activated.", consultation });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Check if a consultation is expired
exports.checkConsultationExpiration = async (req, res) => {
    try {
        const { id } = req.params;

        const consultation = await Consultation.findById(id);
        if (!consultation) {
            return res.status(404).json({ message: "Consultation not found." });
        }

        const expired = await consultation.checkExpiration();
        res.status(200).json({
            expired,
            status: consultation.request.status
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};