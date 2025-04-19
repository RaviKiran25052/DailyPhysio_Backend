const asyncHandler = require('express-async-handler');
const SavedExercise = require('../models/savedExerciseModel');
const Exercise = require('../models/exerciseModel');

// @desc    Get user's saved exercises
// @route   GET /api/saved-exercises
// @access  Private
const getUserSavedExercises = asyncHandler(async (req, res) => {
  const savedExercises = await SavedExercise.find({ userId: req.user._id })
    .populate('exerciseId');
  
  res.json(savedExercises);
});

// @desc    Save an exercise for a user
// @route   POST /api/saved-exercises
// @access  Private
const saveExercise = asyncHandler(async (req, res) => {
  const { 
    exerciseId, 
    reps, 
    hold, 
    complete, 
    perform 
  } = req.body;
  
  // Check if exercise exists
  const exercise = await Exercise.findById(exerciseId);
  
  if (!exercise) {
    res.status(404);
    throw new Error('Exercise not found');
  }
  
  // Check if exercise is premium and user is not pro
  if (exercise.isPremium && (!req.user.pro || !req.user.pro.type)) {
    res.status(403);
    throw new Error('This is a premium exercise. Upgrade to pro to save it.');
  }
  
  // Check if exercise is already saved by this user
  const alreadySaved = await SavedExercise.findOne({
    userId: req.user._id,
    exerciseId: exerciseId,
  });
  
  if (alreadySaved) {
    res.status(400);
    throw new Error('Exercise already saved');
  }
  
  // Create saved exercise
  const savedExercise = await SavedExercise.create({
    userId: req.user._id,
    exerciseId: exerciseId,
    reps: reps || 0,
    hold: hold || 0,
    complete: complete || 0,
    perform: {
      count: perform?.count || 0,
      type: perform?.type || 'day',
    },
  });
  
  if (savedExercise) {
    const populatedSavedExercise = await SavedExercise.findById(savedExercise._id)
      .populate('exerciseId');
      
    res.status(201).json(populatedSavedExercise);
  } else {
    res.status(400);
    throw new Error('Invalid data');
  }
});

// @desc    Update a saved exercise
// @route   PUT /api/saved-exercises/:id
// @access  Private
const updateSavedExercise = asyncHandler(async (req, res) => {
  const { 
    reps, 
    hold, 
    complete, 
    perform 
  } = req.body;
  
  const savedExercise = await SavedExercise.findById(req.params.id);
  
  if (!savedExercise) {
    res.status(404);
    throw new Error('Saved exercise not found');
  }
  
  // Check if this saved exercise belongs to the logged-in user
  if (savedExercise.userId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }
  
  // Update fields
  savedExercise.reps = reps !== undefined ? reps : savedExercise.reps;
  savedExercise.hold = hold !== undefined ? hold : savedExercise.hold;
  savedExercise.complete = complete !== undefined ? complete : savedExercise.complete;
  
  if (perform) {
    savedExercise.perform.count = perform.count !== undefined 
      ? perform.count 
      : savedExercise.perform.count;
      
    savedExercise.perform.type = perform.type 
      ? perform.type 
      : savedExercise.perform.type;
  }
  
  const updatedSavedExercise = await savedExercise.save();
  
  const populatedSavedExercise = await SavedExercise.findById(updatedSavedExercise._id)
    .populate('exerciseId');
    
  res.json(populatedSavedExercise);
});

// @desc    Delete a saved exercise
// @route   DELETE /api/saved-exercises/:id
// @access  Private
const deleteSavedExercise = asyncHandler(async (req, res) => {
  const savedExercise = await SavedExercise.findById(req.params.id);
  
  if (!savedExercise) {
    res.status(404);
    throw new Error('Saved exercise not found');
  }
  
  // Check if this saved exercise belongs to the logged-in user
  if (savedExercise.userId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }
  
  await savedExercise.deleteOne();
  res.json({ message: 'Saved exercise removed' });
});

module.exports = {
  getUserSavedExercises,
  saveExercise,
  updateSavedExercise,
  deleteSavedExercise,
}; 