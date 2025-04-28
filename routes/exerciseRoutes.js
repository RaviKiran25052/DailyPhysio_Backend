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

// Setup routes
router.route('/all')
  .get(getAllExercises)

router.route('/')
  .get(protect, isAdmin, getExercises)
  .post(protect, isAdmin, createExercise);

router.route('/category/:category')
  .get(getExercisesByCategory)

router.route('/featured')
  .get(getFeaturedExercises)

router.route('/:id')
  .get(getExerciseById)
  .put(protect, isAdmin, updateExercise)
  .delete(protect, isAdmin, deleteExercise);

module.exports = router; 