const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Exercise = require('../models/Exercise');
const Therapist = require('../models/Therapist');
const Consultation = require('../models/Consultation');
const generateToken = require('../utils/generateToken');
const { getStorageInfo } = require('../utils/upload');

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

// @desc    Get therapists
// @route   GET /api/admin/therapists
// @access  Private/Admin
const getTherapists = asyncHandler(async (req, res) => {
  try {
    const therapists = await Therapist.find();
    const pendingTherapists = therapists.filter(t => t.status === 'pending');
    const pendingCount = pendingTherapists.length;

    res.json({
      success: true,
      therapists: therapists.filter(therapist => therapist.status !== 'pending'),
      pendingTherapists,
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
    const therapistId = req.params.id;

    // Find the therapist
    const therapist = await Therapist.findById(therapistId);

    if (!therapist) {
      res.status(404);
      throw new Error('Therapist not found');
    }

    const storageInfo = await getStorageInfo(therapist);

    // Fetch all consultations for this therapist
    const consultations = await Consultation.find({ therapist_id: therapistId })
      .populate('patient_id', 'fullName email profileImage')
      .populate('recommendedExercises')
      .sort({ createdAt: -1 });

    for (const consultation of consultations) {
      await consultation.checkExpiration();
    }

    // Fetch all exercises created by this therapist
    const exercises = await Exercise.find({ 'custom.creatorId': therapistId })
      .sort({ createdAt: -1 });

    // Fetch all users created by this therapist
    const users = await User.find({ 'creator.createdById': therapistId })
      .select('fullName email profileImage membership role createdAt')
      .sort({ createdAt: -1 });

    // Calculate some statistics
    const stats = {
      totalConsultations: consultations.length,
      activeConsultations: consultations.filter(c => c.request.status === 'active').length,
      inactiveConsultations: consultations.filter(c => c.request.status === 'inactive').length,
      totalExercises: exercises.length,
      publicExercises: exercises.filter(e => e.custom.type === 'public').length,
      privateExercises: exercises.filter(e => e.custom.type === 'private').length,
      premiumExercises: exercises.filter(e => e.isPremium === true).length,
      totalUsers: users.length,
      activeUsers: users.filter(u => u.membership.some(m => m.status === 'active')).length
    };

    // Update consultation count (optional - uncomment if needed)
    // await therapist.updateConsultationCount();

    res.json({
      success: true,
      therapist,
      storageInfo,
      consultations,
      exercises,
      users,
      stats
    });

  } catch (error) {
    res.status(error.kind === 'ObjectId' ? 404 : 500);
    throw new Error(error.kind === 'ObjectId'
      ? 'Therapist not found'
      : 'Error retrieving therapist details: ' + error.message
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

    for (const consultation of consultations) {
      await consultation.checkExpiration();
    }

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
      .populate('recommendedExercises');

    for (const consultation of consultations) {
      await consultation.checkExpiration();
    }

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

const validCategories = ['Ankle and Foot', 'Cervical', 'Education', 'Elbow and Hand', 'Hip and Knee', 'Lumbar Thoracic', 'Oral Motor', 'Shoulder', 'Special'];
const validPositions = ["Kneeling", "Prone", "Quadruped", "Side Lying", "Sitting", "Standing", "Supine"];
const validSpecializations = ['Orthopedics', 'Neurology', 'Pediatric Therapy', 'Sports Medicine', 'Geriatric Care', 'Manual Therapy', 'Cardiopulmonary', 'Sports Rehabilitation', "Women's Health"];

const getDashboardAnalytics = asyncHandler(async (req, res) => {
  try {
    // User analytics
    const userStats = await getUserAnalytics();

    // Exercise analytics
    const exerciseStats = await getExerciseAnalytics();

    // Therapist analytics
    const therapistStats = await getTherapistAnalytics();

    // Combine all analytics data
    const dashboardData = {
      users: userStats,
      exercises: exerciseStats,
      therapists: therapistStats,
      timestamp: new Date()
    };

    return res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
});

// Helper function to get user analytics
const getUserAnalytics = asyncHandler(async (req, res) => {

  const allUsers = await User.find({});
  let usersToSave = [];

  allUsers.forEach(user => {
    const wasUpdated = user.updateMembershipStatus();
    if (wasUpdated) {
      usersToSave.push(user);
    }
  });

  // Save all updated users in batch
  if (usersToSave.length > 0) {
    await Promise.all(usersToSave.map(user => user.save()));
  }

  // Count regular and pro users
  const regularUsersCount = await User.countDocuments({
    'membership': {
      $elemMatch: {
        'type': 'free',
        'status': 'active'
      }
    },
    'email': { $ne: process.env.ADMIN_EMAIL || 'admin@example.com' }
  });

  const monthlyCount = await User.countDocuments({
    'membership': {
      $elemMatch: {
        'type': 'monthly',
        'status': 'active'
      }
    }
  });

  const yearlyCount = await User.countDocuments({
    'membership': {
      $elemMatch: {
        'type': 'yearly',
        'status': 'active'
      }
    }
  });
  const totalCount = monthlyCount + yearlyCount;


  // Count users created by therapists
  const therapistCreatedUsersCount = await User.countDocuments({
    'creator.createdBy': 'therapist'
  });

  // Count public exercises created by pro users
  const proUserExercisesCount = await Exercise.countDocuments({
    'custom.createdBy': 'proUser',
    'custom.type': 'public'
  });

  return {
    regularUsersCount,
    proUsersCount: totalCount,
    monthlyCount,
    yearlyCount,
    therapistCreatedUsersCount,
    proUserExercisesCount
  };
});

// Helper function to get exercise analytics
const getExerciseAnalytics = asyncHandler(async (req, res) => {
  // Count exercises by creator type
  const creatorCounts = await Exercise.aggregate([
    {
      $group: {
        _id: '$custom.createdBy',
        count: { $sum: 1 }
      }
    }
  ]);

  // Transform to more readable format
  const exercisesByCreator = {};
  creatorCounts.forEach(item => {
    exercisesByCreator[item._id] = item.count;
  });

  // Ensure all creator types are represented
  const creatorTypes = ['admin', 'therapist', 'proUser'];
  creatorTypes.forEach(type => {
    if (!exercisesByCreator[type]) {
      exercisesByCreator[type] = 0;
    }
  });

  // Count exercises by category
  const categoryResults = await Exercise.aggregate([
    {
      $addFields: {
        normalizedCategory: {
          $cond: {
            if: { $in: ['$category', validCategories] },
            then: '$category',
            else: 'Other'
          }
        }
      }
    },
    {
      $group: {
        _id: '$normalizedCategory',
        count: { $sum: 1 }
      }
    }
  ]);

  // Transform category data
  const categoryCounts = {};
  validCategories.forEach(cat => {
    categoryCounts[cat] = 0;
  });
  categoryCounts['Other'] = 0;

  categoryResults.forEach(item => {
    categoryCounts[item._id] = item.count;
  });

  // Count exercises by position
  const positionResults = await Exercise.aggregate([
    {
      $addFields: {
        normalizedPosition: {
          $cond: {
            if: { $in: ['$position', validPositions] },
            then: '$position',
            else: 'Other'
          }
        }
      }
    },
    {
      $group: {
        _id: '$normalizedPosition',
        count: { $sum: 1 }
      }
    }
  ]);

  // Transform position data
  const positionCounts = {};
  validPositions.forEach(pos => {
    positionCounts[pos] = 0;
  });
  positionCounts['Other'] = 0;

  positionResults.forEach(item => {
    positionCounts[item._id] = item.count;
  });

  // Count premium exercises
  const premiumCount = await Exercise.countDocuments({ isPremium: true });
  const freeCount = await Exercise.countDocuments({ isPremium: false });

  return {
    exercisesByCreator,
    categoryCounts,
    positionCounts,
    premiumCount,
    freeCount
  };
});

// Helper function to get therapist analytics
const getTherapistAnalytics = asyncHandler(async (req, res) => {
  // Count therapists by status
  const statusResults = await Therapist.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Transform status data
  const statusCounts = {
    active: 0,
    inactive: 0,
    rejected: 0,
    pending: 0,
    total: 0
  };

  statusResults.forEach(item => {
    statusCounts[item._id] = item.count;
  });

  statusCounts.total =
    (statusCounts.active || 0) +
    (statusCounts.inactive || 0) +
    (statusCounts.rejected || 0);


  // Count therapists by gender
  const genderResults = await Therapist.aggregate([
    {
      $group: {
        _id: '$gender',
        count: { $sum: 1 }
      }
    }
  ]);

  // Transform gender data
  const genderCounts = {
    male: 0,
    female: 0,
    other: 0
  };

  genderResults.forEach(item => {
    genderCounts[item._id] = item.count;
  });

  // Count therapists by specialization
  const specializationResults = await Therapist.aggregate([
    { $unwind: '$specializations' },
    {
      $addFields: {
        normalizedSpecialization: {
          $cond: {
            if: { $in: ['$specializations', validSpecializations] },
            then: '$specializations',
            else: 'Other'
          }
        }
      }
    },
    {
      $group: {
        _id: '$normalizedSpecialization',
        count: { $sum: 1 }
      }
    }
  ]);

  // Transform specialization data
  const specializationCounts = {};
  validSpecializations.forEach(spec => {
    specializationCounts[spec] = 0;
  });
  specializationCounts['Other'] = 0;

  specializationResults.forEach(item => {
    specializationCounts[item._id] = item.count;
  });

  return {
    statusCounts,
    genderCounts,
    specializationCounts
  };
});

module.exports = {
  loginAdmin,
  getAdminStats,
  getTherapists,
  getTherapistById,
  updateTherapist,
  deleteTherapist,
  getConsultations,
  getConsultationsByTherapist,
  updateConsultationStatus,
  approveTherapist,
  getDashboardAnalytics
}