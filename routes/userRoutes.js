const express = require('express');
const router = express.Router();
const { protectUser, protectAdminOrTherapist } = require('../middleware/authMiddleware');
const multer = require('multer');
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  upgradeUserToPro,
  getFavoritesData,
  getFavorite,
  addFavorite,
  removeFavorite,
  getFollowing,
  followTherapist,
  unfollowTherapist,
  getTherapistExercises,
  getAllUsers,
  getMembership,
  updateMembership,
  forgotPassword,
  verifyOTP,
  resetPassword
} = require('../controllers/userController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware for handling file uploads
const uploadProfileImage = upload.single('image');

// Setup routes
router.route('/').get(protectAdminOrTherapist, getAllUsers)
router.route('/register').post(registerUser);
router.post('/login', loginUser);
router.route('/profile')
  .get(protectUser, getUserProfile)
  .put([protectUser, uploadProfileImage], updateUserProfile);
router.route('/upgrade').post(protectUser, upgradeUserToPro);

// Favorites routes
router.route('/favorites')
  .get(protectUser, getFavoritesData)
  .post(protectUser, addFavorite);
router.route('/favorites/:id')
  .get(protectUser, getFavorite)
  .delete(protectUser, removeFavorite);

// Following routes
router.route('/following')
  .get(protectUser, getFollowing)
  .post(protectUser, followTherapist);
router.route('/following/:therapistId')
  .delete(protectUser, unfollowTherapist);
router.route('/therapists/:therapistId/exercises')
  .get(protectUser, getTherapistExercises);

// Membership management
router.route('/membership')
  .get(protectUser, getMembership)
  .put(protectUser, updateMembership);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router; 