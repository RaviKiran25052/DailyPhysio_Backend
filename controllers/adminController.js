const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const Exercise = require('../models/exerciseModel');
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
    const therapistsCount = await User.countDocuments({ role: 'isTherapist' });
    
    // Get additional statistics if needed
    const premiumExercisesCount = await Exercise.countDocuments({ isPremium: true });
    const customExercisesCount = await Exercise.countDocuments({ isCustom: true });
    const proUsersCount = await User.countDocuments({ 
      $and: [
        { role: 'isUser' },
        { 'pro.type': { $in: ['monthly', 'yearly'] } }
      ]
    });
    
    res.json({
      exercisesCount,
      usersCount,
      therapistsCount,
      premiumExercisesCount,
      customExercisesCount,
      proUsersCount
    });
  } catch (error) {
    res.status(500);
    throw new Error('Error retrieving statistics: ' + error.message);
  }
});

module.exports = {
  loginAdmin,
  getAdminStats
}