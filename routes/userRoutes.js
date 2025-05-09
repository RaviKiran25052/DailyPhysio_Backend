const express = require('express');
const router = express.Router();
const { protectUser, protectAdminOrTherapist } = require('../middleware/authMiddleware');
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
  getAllUsers
} = require('../controllers/userController');

// Setup routes

router.route('/').get(protectAdminOrTherapist, getAllUsers)
router.route('/register').post(registerUser);
router.post('/login', loginUser);
router.route('/profile')
  .get(protectUser, getUserProfile)
  .put(protectUser, updateUserProfile);
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

module.exports = router; 