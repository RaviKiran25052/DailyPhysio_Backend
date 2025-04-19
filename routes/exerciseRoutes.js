const express = require('express');
const router = express.Router();
const { protect, isPro } = require('../middleware/authMiddleware');
const { 
  getExercises, 
  getExerciseById,
  updateExercise,
  deleteExercise,
  getFeaturedExercises,
  getExercisesByCategory
} = require('../controllers/exerciseController');

// Setup routes
router.route('/all')
  .get(getExercises)

router.route('/category/:category')
  .get(getExercisesByCategory)

router.route('/featured')
  .get(getFeaturedExercises)

router.route('/:id')
  .get(getExerciseById)
  .put(protect, updateExercise)
  .delete(protect, deleteExercise);

module.exports = router; 