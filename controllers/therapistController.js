// therapistController.js

const Therapist = require('../models/Therapist');
const User = require('../models/User');
const Exercise = require('../models/Exercise');
const Consultation = require('../models/Consultation');
const generateToken = require('../utils/generateToken');
const Followers = require('../models/Followers');

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
                status: therapist.status,
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
            status: therapist.status,
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

// Fetch all exercises
exports.getAllExercises = async (req, res) => {
    try {
        const exercises = await Exercise.find({ 'custom.creatorId': req.therapist._id.toString() });
        res.status(200).json(exercises);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Fetch all consultations
exports.getConsultations = async (req, res) => {
    try {
        const consultations = await Consultation.find({ therapist_id: req.therapist._id })
            .populate({
                path: 'patient_id',
                model: 'User',
                select: 'fullName email profileImage'
            })
            .populate({
                path: 'recommendedExercises',
                model: 'Exercise',
                select: 'title description instruction image category subCategory position reps hold set perform'
            })
            .sort({ createdAt: -1 });

        res.status(200).json(consultations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a consultation entry
exports.createConsultation = async (req, res) => {
    try {
        const { userId, exercises = [], activeDays = 14, desp = '' } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required." });
        }
        const expiresOn = new Date();
        expiresOn.setDate(expiresOn.getDate() + activeDays);

        const consultation = new Consultation({
            therapist_id: req.therapist._id,
            patient_id: userId,
            recommendedExercises: exercises,
            request: { expiresOn },
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

exports.getAnalytics = async (req, res) => {
    try {
        const therapistId = req.therapist._id;

        // Get last 6 months consultations
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // -5 to include current month
        sixMonthsAgo.setDate(1); // Start of month
        sixMonthsAgo.setHours(0, 0, 0, 0);

        // Get consultations for last 6 months
        const consultations = await Consultation.find({
            'therapist_id': therapistId,
            'createdAt': { $gte: sixMonthsAgo }
        }).sort({ createdAt: 1 });

        // Get monthly consultation counts
        const monthlyConsultations = Array(6).fill(0);
        const currentMonth = new Date().getMonth();

        consultations.forEach(consultation => {
            const consultationMonth = new Date(consultation.createdAt).getMonth();
            const monthIndex = (consultationMonth - (currentMonth - 5) + 12) % 12;
            if (monthIndex >= 0 && monthIndex < 6) {
                monthlyConsultations[monthIndex]++;
            }
        });

        // Get total consultations
        const totalConsultations = await Consultation.countDocuments({
            'therapist_id': therapistId
        });

        // Get followers count
        const followers = await Followers.find({
            'therapistId': therapistId
        });
        // Get users created by therapist
        const createdUsersCount = await User.countDocuments({
            'creator.createdBy': 'therapist',
            'creator.createdById': therapistId
        });

        // Get exercises created by therapist and their categories
        const exercises = await Exercise.find({
            'custom.createdBy': 'therapist',
            'custom.creatorId': therapistId
        });

        const exerciseCategories = {};
        exercises.forEach(exercise => {
            exerciseCategories[exercise.category] = (exerciseCategories[exercise.category] || 0) + 1;
        });

        res.json({
            consultations: totalConsultations,
            followers: followers.length,
            createdUsers: createdUsersCount,
            createdExercises: exercises.length,
            monthlyConsultations,
            exerciseCategories
        });

    } catch (error) {
        console.error('Error in getAnalytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics data',
            error: error.message
        });
    }
};

// Update a consultation
exports.updateConsultation = async (req, res) => {
    try {
        const { id } = req.params;
        const { recommendedExercises, activeDays, desp } = req.body;

        const consultation = await Consultation.findById(id);
        if (!consultation) {
            return res.status(404).json({ message: "Consultation not found." });
        }

        // Calculate new expiration date based on creation date and activeDays
        const expiresOn = new Date(consultation.createdAt);
        expiresOn.setDate(expiresOn.getDate() + activeDays);

        // Update consultation
        const updatedConsultation = await Consultation.findByIdAndUpdate(
            id,
            {
                $set: {
                    'request.expiresOn': expiresOn,
                    notes: desp,
                    recommendedExercises: recommendedExercises
                }
            },
            { new: true }
        ).populate({
            path: 'patient_id',
            model: 'User',
            select: 'fullName email profileImage'
        }).populate({
            path: 'recommendedExercises',
            model: 'Exercise',
            select: 'title description instruction image category subCategory position reps hold set perform'
        });

        res.status(200).json(updatedConsultation);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a consultation
exports.deleteConsultation = async (req, res) => {
    try {
        const { id } = req.params;

        const consultation = await Consultation.findById(id);
        if (!consultation) {
            return res.status(404).json({ message: "Consultation not found." });
        }

        // Check if the consultation belongs to the therapist
        if (consultation.therapist_id.toString() !== req.therapist._id.toString()) {
            return res.status(403).json({ message: "Not authorized to delete this consultation." });
        }

        await Consultation.findByIdAndDelete(id);
        res.status(200).json({ message: "Consultation deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get users created by therapist
exports.getCreatedUsers = async (req, res) => {
    try {
        const users = await User.find({
            'creator.createdBy': 'therapist',
            'creator.createdById': req.therapist._id
        }).select('-password');

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};