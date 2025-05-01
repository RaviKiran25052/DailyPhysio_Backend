const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createRoutine,
  getRoutinesByUserId,
  updateRoutine,
  deleteRoutine
} = require('../controllers/routineController');

// All routes are protected and require authentication
router.use(protect);

// Create a new routine
router.post('/', createRoutine);

// Get routines by user id
router.get('/user/:userId', getRoutinesByUserId);

// Get routines for the current logged-in user
router.get('/my-routines', getRoutinesByUserId);

// Update a routine
router.put('/:id', updateRoutine);

// Delete a routine
router.delete('/:id', deleteRoutine);

module.exports = router; 