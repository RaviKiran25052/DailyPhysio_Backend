const express = require('express');
const router = express.Router();
const { protect, isPro } = require('../middleware/authMiddleware');
const { 
  getExercises, 
  getExerciseById, 
  createExercise,
  updateExercise,
  deleteExercise,
  getFeaturedExercises
} = require('../controllers/exerciseController');

// Setup routes
router.route('/all')
  .get(getExercises)

router.route('/featured')
  .get(getFeaturedExercises)

router.route('/:id')
  .get(getExerciseById)
  .put(protect, updateExercise)
  .delete(protect, deleteExercise);

module.exports = router; 