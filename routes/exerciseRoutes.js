const express = require('express');
const router = express.Router();
const { protect, isPro } = require('../middleware/authMiddleware');
const { 
  getExercises, 
  getExerciseById, 
  createExercise,
  updateExercise,
  deleteExercise
} = require('../controllers/exerciseController');

// Setup routes
router.route('/')
  .get(getExercises)
  .post(protect, createExercise);

router.route('/:id')
  .get(getExerciseById)
  .put(protect, updateExercise)
  .delete(protect, deleteExercise);

module.exports = router; 