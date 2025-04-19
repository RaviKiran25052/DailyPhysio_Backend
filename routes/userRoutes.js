const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile, 
  upgradeUserToPro 
} = require('../controllers/userController');

// Setup routes
router.route('/register').post(registerUser);
router.post('/login', loginUser);
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.route('/upgrade').post(protect, upgradeUserToPro);

module.exports = router; 