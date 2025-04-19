const asyncHandler = require('express-async-handler');
const Exercise = require('../models/exerciseModel');

// @desc    Get all exercises
// @route   GET /api/exercises
// @access  Public
const getExercises = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.pageNumber) || 1;
  
  const keyword = req.query.keyword
    ? {
        title: {
          $regex: req.query.keyword,
          $options: 'i',
        },
      }
    : {};

  const category = req.query.category ? { category: req.query.category } : {};
  
  // If user is not pro, filter out premium exercises
  const premiumFilter = req.user && req.user.pro && req.user.pro.type 
    ? {} 
    : { isPremium: false };
  
  const count = await Exercise.countDocuments({ 
    ...keyword, 
    ...category,
    ...premiumFilter
  });
  
  const exercises = await Exercise.find({ 
    ...keyword, 
    ...category,
    ...premiumFilter 
  })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    exercises,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});

// @desc    Get exercise by ID
// @route   GET /api/exercises/:id
// @access  Public/Private (Premium exercises require pro subscription)
const getExerciseById = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);

  if (exercise) {
    // Check if exercise is premium and user is not pro
    if (exercise.isPremium && (!req.user || !req.user.pro || !req.user.pro.type)) {
      res.status(403);
      throw new Error('This is a premium exercise. Upgrade to pro to access it.');
    }
    
    res.json(exercise);
  } else {
    res.status(404);
    throw new Error('Exercise not found');
  }
});

// @desc    Create a new exercise
// @route   POST /api/exercises
// @access  Private
const createExercise = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    instruction,
    video,
    image,
    category,
    position,
    isPremium,
  } = req.body;

  // Creating a custom exercise
  const exercise = await Exercise.create({
    title,
    description,
    instruction,
    video,
    image,
    category,
    position,
    isPremium: isPremium || false,
    isCustom: true, // Custom exercise created by user
  });

  if (exercise) {
    res.status(201).json(exercise);
  } else {
    res.status(400);
    throw new Error('Invalid exercise data');
  }
});

// @desc    Update an exercise
// @route   PUT /api/exercises/:id
// @access  Private
const updateExercise = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    instruction,
    video,
    image,
    category,
    position,
    isPremium,
  } = req.body;

  const exercise = await Exercise.findById(req.params.id);

  if (exercise) {
    // Only allow updates to custom exercises created by the user
    if (!exercise.isCustom) {
      res.status(403);
      throw new Error('Can only update custom exercises');
    }

    exercise.title = title || exercise.title;
    exercise.description = description || exercise.description;
    exercise.instruction = instruction || exercise.instruction;
    exercise.video = video || exercise.video;
    exercise.image = image || exercise.image;
    exercise.category = category || exercise.category;
    exercise.position = position || exercise.position;
    exercise.isPremium = isPremium !== undefined ? isPremium : exercise.isPremium;

    const updatedExercise = await exercise.save();
    res.json(updatedExercise);
  } else {
    res.status(404);
    throw new Error('Exercise not found');
  }
});

// @desc    Delete an exercise
// @route   DELETE /api/exercises/:id
// @access  Private
const deleteExercise = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);

  if (exercise) {
    // Only allow deletion of custom exercises created by the user
    if (!exercise.isCustom) {
      res.status(403);
      throw new Error('Can only delete custom exercises');
    }

    await exercise.deleteOne();
    res.json({ message: 'Exercise removed' });
  } else {
    res.status(404);
    throw new Error('Exercise not found');
  }
});

module.exports = {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
}; 