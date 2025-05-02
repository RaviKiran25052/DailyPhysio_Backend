const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile, 
  upgradeUserToPro,
  getFavorites,
  addFavorite,
  removeFavorite,
  getFollowing,
  followTherapist,
  unfollowTherapist,
  getTherapistExercises
} = require('../controllers/userController');

// Setup routes
router.route('/register').post(registerUser);
router.post('/login', loginUser);
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.route('/upgrade').post(protect, upgradeUserToPro);

// Favorites routes
router.route('/favorites')
  .get(protect, getFavorites)
  .post(protect, addFavorite);
router.route('/favorites/:id').delete(protect, removeFavorite);

// Following routes
router.route('/following')
  .get(protect, getFollowing)
  .post(protect, followTherapist);
router.route('/following/:therapistId')
  .delete(protect, unfollowTherapist);
router.route('/therapists/:therapistId/exercises')
  .get(protect, getTherapistExercises);

module.exports = router; 