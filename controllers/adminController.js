const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Exercise = require('../models/Exercise');
const Therapist = require('../models/Therapist');
const Consultation = require('../models/Consultation');
const generateToken = require('../utils/generateToken');

const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password)) && user.role == 'isAdmin') {
    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      pro: user.pro,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = asyncHandler(async (req, res) => {
  try {
    // Count total exercises
    const exercisesCount = await Exercise.countDocuments({});

    // Count users by role
    const usersCount = await User.countDocuments({ role: 'isUser' });
    const therapistsCount = await Therapist.countDocuments({ status: 'active' });

    // Get additional statistics if needed
    const premiumExercisesCount = await Exercise.countDocuments({ isPremium: true });
    const customExercisesCount = await Exercise.countDocuments({ isCustom: true });
    const proUsersCount = await User.countDocuments({
      $and: [
        { role: 'isUser' },
        { 'pro.type': { $in: ['monthly', 'yearly'] } }
      ]
    });

    // Get consultation statistics
    const activeConsultationsCount = await Consultation.countDocuments({
      'request.status': 'active'
    });

    const pendingConsultationsCount = await Consultation.countDocuments({
      'request.status': 'pending'
    });

    res.json({
      exercisesCount,
      usersCount,
      therapistsCount,
      premiumExercisesCount,
      customExercisesCount,
      proUsersCount,
      activeConsultationsCount,
      pendingConsultationsCount
    });
  } catch (error) {
    res.status(500);
    throw new Error('Error retrieving statistics: ' + error.message);
  }
});

// @desc    Get all users for admin
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  try {
    // Get all users
    const users = await User.find({}).select('-password');

    res.json({
      users,
      count: users.length
    });
  } catch (error) {
    res.status(500);
    throw new Error('Error retrieving users: ' + error.message);
  }
});

// THERAPIST MANAGEMENT
const approveTherapist = async (req, res) => {
  try {
      const { id } = req.params;
      
      const therapist = await Therapist.findByIdAndUpdate(id, { status: req.body.state }, { new: true });
      if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
      res.status(200).json(therapist);
  } catch (error) {
      res.status(400).json({ message: error.message });
  }
};

const getAllTherapists = asyncHandler(async (req, res) => {
  try {
    const therapists = await Therapist.find({});

    res.json({
      success: true,
      therapists,
    });
  } catch (error) {
    res.status(500);
    throw new Error('Error retrieving therapists: ' + error.message);
  }
});

// @desc    Get therapists
// @route   GET /api/admin/therapists
// @access  Private/Admin
const getTherapists = asyncHandler(async (req, res) => {
  try {
    const therapists = await Therapist.find({ status: 'active' });
    const pendingCount = await Therapist.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      therapists,
      requestCount: pendingCount
    });
  } catch (error) {
    res.status(500);
    throw new Error('Error retrieving therapists: ' + error.message);
  }
});

// @desc    Get a single therapist by ID
// @route   GET /api/admin/therapists/:id
// @access  Private/Admin
const getTherapistById = asyncHandler(async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.params.id);

    if (!therapist) {
      res.status(404);
      throw new Error('Therapist not found');
    }

    // Update request count
    // await therapist.calculatePendingRequests();

    res.json({
      success: true,
      therapist
    });
  } catch (error) {
    res.status(error.kind === 'ObjectId' ? 404 : 500);
    throw new Error(error.kind === 'ObjectId'
      ? 'Therapist not found'
      : 'Error retrieving therapist: ' + error.message
    );
  }
});

// @desc    Update a therapist
// @route   PUT /api/admin/therapists/:id
// @access  Private/Admin
const updateTherapist = asyncHandler(async (req, res) => {
  try {
    const {
      name,
      email,
      gender,
      specializations,
      workingAt,
      address,
      experience
    } = req.body;

    // Find therapist
    const therapist = await Therapist.findById(req.params.id);
    if (!therapist) {
      res.status(404);
      throw new Error('Therapist not found');
    }

    // Check if updated email is already in use by another therapist
    if (email !== therapist.email) {
      const existingTherapist = await Therapist.findOne({ email });
      if (existingTherapist) {
        res.status(400);
        throw new Error('A therapist with this email already exists');
      }
    }

    // Update therapist
    therapist.name = name || therapist.name;
    therapist.email = email || therapist.email;
    therapist.gender = gender || therapist.gender;
    therapist.specializations = specializations || therapist.specializations;
    therapist.workingAt = workingAt || therapist.workingAt;
    therapist.address = address || therapist.address;
    therapist.experience = experience || therapist.experience;

    const updatedTherapist = await therapist.save();

    res.json({
      success: true,
      therapist: updatedTherapist
    });
  } catch (error) {
    res.status(error.status || 500);
    throw new Error(error.message || 'Error updating therapist');
  }
});

// @desc    Delete a therapist
// @route   DELETE /api/admin/therapists/:id
// @access  Private/Admin
const deleteTherapist = asyncHandler(async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.params.id);

    if (!therapist) {
      res.status(404);
      throw new Error('Therapist not found');
    }

    // Check if therapist has active consultations
    const activeConsultations = await Consultation.countDocuments({
      therapist_id: therapist._id,
      'request.status': 'active'
    });

    if (activeConsultations > 0) {
      res.status(400);
      throw new Error('Cannot delete therapist with active consultations');
    }

    // Delete all consultations associated with this therapist
    await Consultation.deleteMany({ therapist_id: therapist._id });

    res.json({
      success: true,
      message: 'Therapist deleted successfully'
    });
  } catch (error) {
    res.status(error.status || 500);
    throw new Error(error.message || 'Error deleting therapist');
  }
});

// CONSULTATION MANAGEMENT

// @desc    Get all consultations
// @route   GET /api/admin/consultations
// @access  Private/Admin
const getConsultations = asyncHandler(async (req, res) => {
  try {
    const consultations = await Consultation.find({})
      .populate('therapist_id', 'name email')
      .populate('patient_id', 'fullName email')
      .populate('recommendedExercises', 'title bodyPart');

    res.json({
      success: true,
      consultations,
      count: consultations.length
    });
  } catch (error) {
    res.status(500);
    throw new Error('Error retrieving consultations: ' + error.message);
  }
});

// @desc    Get consultations by therapist
// @route   GET /api/admin/consultations/therapist/:id
// @access  Private/Admin
const getConsultationsByTherapist = asyncHandler(async (req, res) => {
  try {
    const therapistId = req.params.id;

    // Verify therapist exists
    const therapist = await Therapist.findById(therapistId);
    if (!therapist) {
      res.status(404);
      throw new Error('Therapist not found');
    }

    const consultations = await Consultation.find({ therapist_id: therapistId })
      .populate('patient_id', 'fullName email')
      .populate('recommendedExercises', 'title bodyPart');

    res.json({
      success: true,
      therapist,
      consultations,
      count: consultations.length
    });
  } catch (error) {
    res.status(error.kind === 'ObjectId' ? 404 : 500);
    throw new Error(error.kind === 'ObjectId'
      ? 'Therapist not found'
      : 'Error retrieving consultations: ' + error.message
    );
  }
});

// @desc    Update consultation status
// @route   PUT /api/admin/consultations/:id/status
// @access  Private/Admin
const updateConsultationStatus = asyncHandler(async (req, res) => {
  try {
    const { status, activeDays } = req.body;

    if (!['pending', 'active', 'inactive'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status value');
    }

    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      res.status(404);
      throw new Error('Consultation not found');
    }

    if (status === 'active') {
      // Activate the consultation with the specified days
      await consultation.activateConsultation(activeDays);
    } else {
      // Simply update the status
      consultation.request.status = status;
      await consultation.save();
    }

    // Update therapist counts
    const therapist = await Therapist.findById(consultation.therapist_id);
    // if (therapist) {
    //   await therapist.calculatePendingRequests();
    // }

    res.json({
      success: true,
      consultation
    });
  } catch (error) {
    res.status(error.status || 500);
    throw new Error(error.message || 'Error updating consultation status');
  }
});

module.exports = {
  loginAdmin,
  getAdminStats,
  getUsers,
  getAllTherapists,
  getTherapists,
  getTherapistById,
  updateTherapist,
  deleteTherapist,
  getConsultations,
  getConsultationsByTherapist,
  updateConsultationStatus,
  approveTherapist
}