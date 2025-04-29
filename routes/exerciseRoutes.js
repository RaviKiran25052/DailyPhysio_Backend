const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const {
  getExercises,
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  getFeaturedExercises,
  getExercisesByCategory
} = require('../controllers/exerciseController');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Setup routes
router.route('/all')
  .get(protect, getAllExercises)

router.route('/')
  .get(protect, isAdmin, getExercises)
  .post(protect, isAdmin, upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 5 }
  ]),  createExercise);

router.route('/category/:category')
  .get(getExercisesByCategory)

router.route('/featured')
  .get(getFeaturedExercises)

router.route('/:id')
  .get(getExerciseById)
  .put(protect, isAdmin, upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 5 }
  ]),  updateExercise)
  .delete(protect, isAdmin, deleteExercise);

module.exports = router; 