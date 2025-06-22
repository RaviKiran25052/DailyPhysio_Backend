const asyncHandler = require('express-async-handler');
const Routine = require('../models/Routine');
const Exercise = require('../models/Exercise');
const User = require('../models/User');

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

  // Get the user to check membership type
  const user = await User.findById(req.user._id);

  // Check if the user is not a pro member (i.e., has free membership)
  // Get current active membership
  const currentMembership = user.getCurrentMembership();

  if (currentMembership && currentMembership.type === 'free' && currentMembership.status === 'active') {
    // Count existing routines for this user
    const routineCount = await Routine.countDocuments({ userId: req.user._id });

    // If user has 3 or more routines already, return error
    if (routineCount >= 3) {
      res.status(403);
      throw new Error('Free users can only create 3 routines. Please upgrade to Pro for unlimited routines.');
    }
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
  const userId = req.user._id;

  // Find all routines for the user and populate exercise data
  const routines = await Routine.find({ userId })
    .populate({
      path: 'exerciseId',
      select: 'title description instruction video image views favorites category subCategory position isPremium custom'
    })
    .lean();

  // Return 404 if no routines found
  if (!routines.length) {
    res.status(404);
    throw new Error('No routines found for this user');
  }

  // Format data for response
  const formattedRoutines = routines.map(routine => {
    return {
      routineId: routine._id,
      name: routine.name,
      reps: routine.reps,
      hold: routine.hold,
      complete: routine.complete,
      perform: routine.perform,
      exercise: routine.exerciseId, // This contains the full exercise document
      updatedAt: routine.updatedAt || routine.createdAt
    };
  });

  res.status(200).json({
    success: true,
    count: formattedRoutines.length,
    data: formattedRoutines
  });
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