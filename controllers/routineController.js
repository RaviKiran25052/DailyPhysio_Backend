const asyncHandler = require('express-async-handler');
const Routine = require('../models/Routine');
const Exercise = require('../models/Exercise');

// @desc    Create a new routine
// @route   POST /api/routines
// @access  Private
const createRoutine = asyncHandler(async (req, res) => {
  const { exerciseId, name, reps, hold, complete, perform } = req.body;

  // Check if exercise exists
  const exercise = await Exercise.findById(exerciseId);
  if (!exercise) {
    res.status(404);
    throw new Error('Exercise not found');
  }

  // Create new routine
  const routine = await Routine.create({
    userId: req.user._id,
    exerciseId,
    name,
    reps,
    hold,
    complete,
    perform
  });

  res.status(201).json(routine);
});

// @desc    Get routines by user ID
// @route   GET /api/routines/user/:userId
// @route   GET /api/routines/my-routines (for current user)
// @access  Private
const getRoutinesByUserId = asyncHandler(async (req, res) => {
  // If getting own routines, use req.user._id, otherwise use the userId from params
  const userId = req.path.includes('my-routines') ? req.user._id : req.params.userId;

  // Check if user is authorized to view these routines
  if (userId.toString() !== req.user._id.toString() && req.user.role !== 'isAdmin') {
    res.status(403);
    throw new Error('Not authorized to view these routines');
  }

  // Find routines and populate exercise details
  const routines = await Routine.find({ userId })
    .populate('exerciseId', 'title description instruction category subCategory position image')
    .sort({ updatedAt: -1 });

  res.json(routines);
});

// @desc    Update a routine
// @route   PUT /api/routines/:id
// @access  Private
const updateRoutine = asyncHandler(async (req, res) => {
  const routineId = req.params.id;
  
  // Find the routine
  const routine = await Routine.findById(routineId);
  
  if (!routine) {
    res.status(404);
    throw new Error('Routine not found');
  }
  
  // Check if user is authorized to update this routine
  if (routine.userId.toString() !== req.user._id.toString() && req.user.role !== 'isAdmin') {
    res.status(403);
    throw new Error('Not authorized to update this routine');
  }
  
  // Update routine fields
  const { name, reps, hold, complete, perform } = req.body;
  
  routine.name = name || routine.name;
  routine.reps = reps !== undefined ? reps : routine.reps;
  routine.hold = hold !== undefined ? hold : routine.hold;
  routine.complete = complete !== undefined ? complete : routine.complete;
  
  if (perform) {
    routine.perform.count = perform.count !== undefined ? perform.count : routine.perform.count;
    routine.perform.type = perform.type || routine.perform.type;
  }
  
  const updatedRoutine = await routine.save();
  
  res.json(updatedRoutine);
});

// @desc    Delete a routine
// @route   DELETE /api/routines/:id
// @access  Private
const deleteRoutine = asyncHandler(async (req, res) => {
  const routineId = req.params.id;
  
  // Find the routine
  const routine = await Routine.findById(routineId);
  
  if (!routine) {
    res.status(404);
    throw new Error('Routine not found');
  }
  
  // Check if user is authorized to delete this routine
  if (routine.userId.toString() !== req.user._id.toString() && req.user.role !== 'isAdmin') {
    res.status(403);
    throw new Error('Not authorized to delete this routine');
  }
  
  await Routine.findByIdAndDelete(routineId);
  
  res.json({ message: 'Routine removed' });
});

module.exports = {
  createRoutine,
  getRoutinesByUserId,
  updateRoutine,
  deleteRoutine
}; 