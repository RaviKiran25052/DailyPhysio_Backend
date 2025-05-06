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