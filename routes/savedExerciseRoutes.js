const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getUserSavedExercises, 
  saveExercise, 
  updateSavedExercise,
  deleteSavedExercise
} = require('../controllers/savedExerciseController');

// Setup routes
router.route('/')
  .get(protect, getUserSavedExercises)
  .post(protect, saveExercise);

router.route('/:id')
  .put(protect, updateSavedExercise)
  .delete(protect, deleteSavedExercise);

module.exports = router; 