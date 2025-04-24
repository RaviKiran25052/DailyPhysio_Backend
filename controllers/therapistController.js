// therapistController.js

const Therapist = require('../models/Therapist');
const User = require('../models/User');
const Exercise = require('../models/Exercise');
const Consultation = require('../models/Consultation');

// Create a new therapist
exports.createTherapist = async (req, res) => {
    try {
        const therapist = new Therapist(req.body);
        await therapist.save();
        res.status(201).json(therapist);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all therapists
exports.getAllTherapists = async (req, res) => {
    try {
        const therapists = await Therapist.find();
        res.status(200).json(therapists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a therapist
exports.updateTherapist = async (req, res) => {
    try {
        const { id } = req.params;
        const therapist = await Therapist.findByIdAndUpdate(id, req.body, { new: true });
        if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
        res.status(200).json(therapist);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a therapist
exports.deleteTherapist = async (req, res) => {
    try {
        const { id } = req.params;
        const therapist = await Therapist.findByIdAndDelete(id);
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

// Create a consultation entry
exports.createConsultation = async (req, res) => {
    try {
        const { therapistId, userId, recommendedExercises } = req.body;
        const consultation = new Consultation({ therapistId, userId, recommendedExercises });
        await consultation.save();
        res.status(201).json(consultation);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};