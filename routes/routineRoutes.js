const express = require('express');
const router = express.Router();
const { protectUser } = require('../middleware/authMiddleware');
const {
  createRoutine,
  getRoutinesByUserId,
  updateRoutine,
  deleteRoutine
} = require('../controllers/routineController');

// All routes are protectUsered and require authentication
router.use(protectUser);

// Create a new routine
router.route('/')
  .post(createRoutine)
  .get(getRoutinesByUserId);

// Update a routine
router.route('/:id')
  .put(updateRoutine)
  .delete(deleteRoutine);

module.exports = router; 