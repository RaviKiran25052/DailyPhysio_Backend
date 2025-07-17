// therapistController.js

const Therapist = require('../models/Therapist');
const User = require('../models/User');
const Exercise = require('../models/Exercise');
const Consultation = require('../models/Consultation');
const generateToken = require('../utils/generateToken');
const { uploadToCloudinary } = require('../utils/cloudinary');
const Followers = require('../models/Followers');

// Create a new therapist
exports.registerTherapist = async (req, res) => {
    try {
        console.log(0);

        const { email } = req.body;

        // Check if therapist already exists
        const existingTherapist = await Therapist.findOne({ email });

        if (existingTherapist) {
            return res.status(400).json({
                status: "error",
                message: "Email already exists",
            });
        }
        console.log(1);

        const therapistData = {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            specializations: req.body.specializations,
            experience: req.body.experience,
            gender: req.body.gender,
            workingAt: req.body.workingAt,
            address: req.body.address,
            phoneNumber: req.body.phoneNumber,
            profilePic: 'https://res.cloudinary.com/dalzs7bc2/image/upload/v1746784719/doc_jcxqwb.png'
        }
        if (req.file) {
            try {
                // Upload image to Cloudinary
                therapistData.profilePic = await uploadToCloudinary(req.file, 'image', 'hep2go/images');
            } catch (uploadError) {
                res.status(500);
                throw new Error('Image upload failed');
            }
        }
        console.log(2);

        // Create and save new therapist
        const therapist = new Therapist(therapistData);
        await therapist.save();
        console.log(3);

        res.status(201).json({
            status: "success",
            message: "Therapist registered successfully",
            data: {
                _id: therapist._id,
                name: therapist.name,
                email: therapist.email,
                status: therapist.status,
                token: generateToken(therapist._id),
            }
        });

    } catch (error) {
        res.status(500).json({
            status: "error",
            message: error.message,
        });
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
        const therapist = await Therapist.findById(req.therapist._id);
        res.status(200).json(therapist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a therapist
exports.updateTherapist = async (req, res) => {
    const therapist = await Therapist.findById(req.therapist._id);
    if (therapist) {
        // Update all fields from req.body, except sensitive ones
        Object.keys(req.body).forEach(key => {
            if (key !== 'password') {
                therapist[key] = req.body[key];
            }
        });

        // Handle password update separately
        if (req.body.password) {
            therapist.password = req.body.password;
        }
        if (req.file) {
            try {
                // Upload image to Cloudinary
                therapist.profilePic = await uploadToCloudinary(req.file, 'image', 'hep2go/images');
            } catch (uploadError) {
                res.status(500);
                throw new Error('Image upload failed');
            }
        }
        const updatedTherapist = await therapist.save();

        // Create response object excluding sensitive information
        res.json({
            _id: updatedTherapist._id,
            name: updatedTherapist.name,
            email: updatedTherapist.email,
            workingAt: updatedTherapist.workingAt,
            experience: updatedTherapist.experience,
            address: updatedTherapist.address,
            phoneNumber: updatedTherapist.phoneNumber,
            gender: updatedTherapist.gender,
            specializations: updatedTherapist.specializations,
            token: generateToken(updatedTherapist._id),
        });
    } else {
        res.status(404);
        throw new Error('Therapist not found');
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

exports.createExercise = async (req, res) => {
    const {
        title,
        description,
        instruction,
        reps,
        hold,
        set,
        perform,
        category,
        subCategory,
        position,
        isPremium
    } = req.body;

    // Determine creator type and ID
    let createdBy = 'therapist';
    let creatorId = req.therapist._id;

    let imageUrls = [];
    let videoUrl = null;

    // Process uploaded files (local storage)
    if (req.files) {
        // Process images
        if (req.files.images && req.files.images.length > 0) {
            imageUrls = req.files.images.map(file => {
                // Return the relative path to the file
                const relativePath = file.path.replace(/\\/g, '/'); // Convert Windows paths to Unix style
                return relativePath.split('/uploads/')[1]; // Store relative path from uploads folder
            });
        }

        // Process video
        if (req.files.video && req.files.video.length > 0) {
            const videoFile = req.files.video[0];
            const relativePath = videoFile.path.replace(/\\/g, '/');
            videoUrl = relativePath.split('/uploads/')[1];
        }
    }

    // Create the exercise
    const exercise = await Exercise.create({
        title,
        description,
        instruction,
        reps: reps || 1,
        hold: hold || 1,
        set: set || 1,
        perform: perform || { count: 1, type: 'day' },
        video: videoUrl,
        image: imageUrls,
        category,
        subCategory,
        position,
        isPremium: isPremium || false,
        custom: {
            createdBy,
            type: 'public',
            creatorId
        }
    });

    // Include storage info in response
    const response = {
        ...exercise.toObject(),
        storageInfo: req.storageInfo // Added by checkStorageLimit middleware
    };

    res.status(201).json(response);
}

exports.editExercise = async (req, res) => {
    const exerciseId = req.params.id;

    // Find the exercise
    const exercise = await Exercise.findById(exerciseId);

    if (!exercise) {
        res.status(404);
        throw new Error('Exercise not found');
    }

    // Extract fields from request
    const {
        title,
        description,
        instruction,
        reps,
        hold,
        set,
        perform,
        category,
        subCategory,
        position,
        isPremium,
        custom,
        oldImages,
        oldVideo
    } = req.body;

    // Handle file uploads (images and videos)
    let imageUrls = oldImages || [];
    let videoUrl = oldVideo || null;

    if (req.files) {
        if (req.files.images) {
            const newImages = req.files.images.map(file => {
                // Return the relative path to the file
                const relativePath = file.path.replace(/\\/g, '/'); // Convert Windows paths to Unix style
                return relativePath.split('/uploads/')[1]; // Store relative path from uploads folder
            });

            imageUrls = [...imageUrls, ...newImages];
        }

        if (req.files.video) {
            const videoFile = req.files.video[0];
            const relativePath = videoFile.path.replace(/\\/g, '/');
            videoUrl = relativePath.split('/uploads/')[1];
        }
    }

    // Update the exercise
    exercise.title = title || exercise.title;
    exercise.description = description || exercise.description;
    exercise.instruction = instruction || exercise.instruction;
    exercise.reps = reps || exercise.reps;
    exercise.hold = hold || exercise.hold;
    exercise.set = set || exercise.set;
    exercise.perform = perform || exercise.perform;
    exercise.image = imageUrls;
    exercise.video = videoUrl;
    exercise.category = category || exercise.category;
    exercise.subCategory = subCategory || exercise.subCategory;
    exercise.position = position || exercise.position;
    exercise.isPremium = isPremium !== undefined ? isPremium : exercise.isPremium;
    exercise.custom = { ...exercise.custom, type: custom.type } || exercise.custom;

    const updatedExercise = await exercise.save();

    res.json(updatedExercise);
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

// Get therapist membership details
exports.getMembership = async (req, res) => {
    try {
        const therapist = await Therapist.findById(req.therapist._id);
        if (!therapist) {
            return res.status(404).json({ message: 'Therapist not found' });
        }

        // If membership field doesn't exist, return default free plan
        if (!therapist.membership) {
            return res.status(200).json({
                type: 'free',
                isActive: true,
                payments: []
            });
        }

        res.status(200).json(therapist.membership);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update therapist membership
exports.updateMembership = async (req, res) => {
    try {
        const { type, paymentMethod } = req.body;
        const therapist = await Therapist.findById(req.therapist._id);

        if (!therapist) {
            return res.status(404).json({ message: 'Therapist not found' });
        }

        // Calculate expiry date based on plan type
        const now = new Date();
        let expiresAt = null;
        let amount = 0;

        if (type === 'monthly') {
            expiresAt = new Date(now);
            expiresAt.setMonth(expiresAt.getMonth() + 1);
            amount = 19.99;
        } else if (type === 'yearly') {
            expiresAt = new Date(now);
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            amount = 199.99;
        }

        // Create payment record for paid plans
        const payment = type !== 'free' ? {
            date: now,
            amount,
            plan: type,
            method: paymentMethod,
            status: 'completed'
        } : null;

        // Initialize membership if it doesn't exist
        if (!therapist.membership) {
            therapist.membership = {
                type,
                isActive: true,
                startedAt: now,
                expiresAt,
                payments: payment ? [payment] : []
            };
        } else {
            // Update existing membership
            therapist.membership.type = type;
            therapist.membership.isActive = true;
            therapist.membership.expiresAt = expiresAt;

            // Add payment record for paid plans
            if (payment) {
                if (!therapist.membership.payments) {
                    therapist.membership.payments = [payment];
                } else {
                    therapist.membership.payments.push(payment);
                }
            }
        }

        await therapist.save();
        res.status(200).json(therapist.membership);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate and send OTP for password reset
// @route   POST /therapist/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if therapist exists
        const therapist = await Therapist.findOne({ email });
        if (!therapist) {
            return res.status(404).json({ message: 'Therapist not found' });
        }

        // Generate a random 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        // Store OTP in therapist document with expiration time (10 minutes)
        therapist.resetPasswordOTP = otp;
        therapist.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await therapist.save();

        // Send email with OTP
        const nodemailer = require('nodemailer');

        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'dailyphysio2025@gmail.com',
                pass: 'ocqs nxia dbsp kqsm'
            }
        });

        // Create email content with HTML
        const mailOptions = {
            from: 'dailyphysio2025@gmail.com',
            to: email,
            subject: 'Reset password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #6b46c1;">Password Reset Request</h2>
                    <p>We received a request to reset your password. Please use the following OTP to complete your password reset:</p>
                    <h1 style="font-size: 32px; color: #6b46c1; text-align: center; padding: 10px; background-color: #f7f7f7; border-radius: 5px;"><strong>${otp}</strong></h1>
                    <p>This OTP will expire in 10 minutes.</p>
                    <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
                    <p>Thank you,<br>The DailyPhysio Team</p>
                </div>
            `
        };

        // Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Email error:', error);
                return res.status(500).json({ message: 'Failed to send email' });
            }
        });

        res.json({ message: 'OTP sent to email' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP for password reset
// @route   POST /therapist/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Check if therapist exists with matching OTP and valid expiration
        const therapist = await Therapist.findOne({
            email,
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!therapist) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset password with new password
// @route   POST /therapist/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;

        // Validate password match
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Find therapist
        const therapist = await Therapist.findOne({
            email,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!therapist) {
            return res.status(400).json({ message: 'Password reset session expired' });
        }

        // Update password
        therapist.password = password;
        therapist.resetPasswordOTP = undefined;
        therapist.resetPasswordExpires = undefined;
        await therapist.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};