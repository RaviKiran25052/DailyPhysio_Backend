const express = require('express');
const router = express.Router();
const { protect, isTherapist, isAdmin } = require('../middleware/authMiddleware');
const { checkMembership } = require('../middleware/membershipMiddleware');
const multer = require('multer');

const {
  getExerciseById,
  getFeaturedExercises,
  filterExercises,
  getExercisesByCreator,
  getFavorites,
  addToFavorites,
  createExercise,
  editExercise
} = require('../controllers/exerciseController');

// Setup multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware for handling file uploads
const uploadFiles = upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'videos', maxCount: 5 }
]);

// Public routes with membership check
router.get('/featured', getFeaturedExercises);
router.get('/filters', checkMembership, filterExercises);
router.get('/creator/:id', checkMembership, getExercisesByCreator);
router.get('/:id', checkMembership, getExerciseById);

// Protected routes
router.get('/favorites/:exId', protect, getFavorites);
router.post('/favorites/:exId', protect, addToFavorites);

// Protected routes with file upload
router.post('/add', [protect, uploadFiles], createExercise);
router.put('/edit/:id', [protect, uploadFiles], editExercise);

module.exports = router;
