const asyncHandler = require('express-async-handler');
const Exercise = require('../models/Exercise');

// @desc    Get one sample exercise from each category
// @route   GET /exercises/samples
// @access  Public/Private (depends on premium content)
const getFeaturedExercises = asyncHandler(async (req, res) => {
  // If user is not pro, filter out premium exercises
  const premiumFilter = req.user && req.user.pro && req.user.pro.type
    ? {}
    : { isPremium: false };

  // Get all available categories
  const categories = [
    'Ankle and Foot',
    'Cervical',
    'Education',
    'Elbow and Hand',
    'Hip and Knee',
    'Lumbar Thoracic',
    'Oral Motor',
    'Shoulder',
    'Special'
  ];

  // Use aggregation to get one exercise from each category
  const sampleExercises = await Promise.all(
    categories.map(async (category) => {
      // Find one exercise from current category that matches premium filter
      const exercise = await Exercise.findOne({
        category: category,
        ...premiumFilter
      });

      return exercise;
    })
  );

  // Filter out any null results (in case a category has no exercises that match filters)
  const validExercises = sampleExercises.filter(exercise => exercise !== null);

  res.json({
    exercises: validExercises,
    total: validExercises.length
  });
});

// @desc    Get exercises with pagination and filtering
// @route   GET /api/exercises/?pageNumber=1&keyword=example&category=Ankle%20and%20Foot
// @access  Protected (if premium content)
const getExercises = asyncHandler(async (req, res) => {
  const pageSize = 9;
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
  const isPremium = req.query.isPremium ? { isPremium: req.query.isPremium } : {};
  const isCustom = req.query.isCustom ? { isCustom: req.query.isCustom } : {};

  const count = await Exercise.countDocuments({
    ...keyword,
    ...category,
    ...isPremium,
    ...isCustom
  });

  const exercises = await Exercise.find({
    ...keyword,
    ...category,
    ...isPremium,
    ...isCustom
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

// @desc    Get all exercises
// @route   GET /exercises/all
// @access  Public
const getAllExercises = asyncHandler(async (req, res) => {

  const category = req.query.category ? { category: req.query.category } : {};

  // If user is not pro, filter out premium exercises
  const premiumFilter = req.user && req.user.pro && req.user.pro.type
    ? {}
    : { isPremium: false };

  const exercises = await Exercise.find({
    ...category,
    ...premiumFilter
  })
  res.json({
    exercises
  });
});

// @desc    Get exercises by category with filtering and pagination
// @route   GET /exercises/category/:category
// @access  Public/Private (depending on premium content)

const getExercisesByCategory = asyncHandler(async (req, res) => {
  const category = req.params.category;
  const pageSize = Number(req.query.pageSize) || 9;
  const page = Number(req.query.page) || 1;

  // Validate category
  const validCategories = [
    'Ankle and Foot',
    'Cervical',
    'Education',
    'Elbow and Hand',
    'Hip and Knee',
    'Lumbar Thoracic',
    'Oral Motor',
    'Shoulder',
    'Special'
  ];

  if (!validCategories.includes(category)) {
    res.status(400);
    throw new Error('Invalid category');
  }

  // Build the query
  const query = { category };

  // Optional subCategory filter
  if (req.query.subCategory) {
    query.subCategory = req.query.subCategory;
  }

  // Optional position filter
  if (req.query.position) {
    query.position = req.query.position;
  }

  // Filter out premium content for non-pro users
  const premiumFilter = req.user && req.user.pro && req.user.pro.type ? {} : { isPremium: false };

  // Combine filters
  const finalQuery = {
    ...query,
    ...premiumFilter
  };

  // Add search query if provided
  if (req.query.search) {
    finalQuery.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  // Count the total number of matching exercises
  const count = await Exercise.countDocuments(finalQuery);

  // Fetch the exercises with pagination
  const exercises = await Exercise.find(finalQuery)
    .sort({ createdAt: -1 }) // Sort by newest first
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  // Return the exercises with pagination info
  res.json({
    exercises,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
    category,
    hasMore: page * pageSize < count
  });
});

// @desc    Get exercise by ID
// @route   GET /exercises/:id
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
// @route   POST /exercises
// @access  Private/Admin
const createExercise = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    instruction,
    video,
    image,
    category,
    subCategory,
    position,
    isPremium,
    isCustom
  } = req.body;

  // Validate required fields
  if (!title || !description || !instruction || !category || !subCategory || !position) {
    res.status(400);
    throw new Error('Please fill all required fields');
  }

  // Create the exercise
  const exercise = await Exercise.create({
    title,
    description,
    instruction,
    video: video || '',
    image: image || '',
    category,
    subCategory,
    position,
    isPremium: isPremium || false,
    isCustom: isCustom || false
  });

  if (exercise) {
    res.status(201).json(exercise);
  } else {
    res.status(400);
    throw new Error('Invalid exercise data');
  }
});

// @desc    Update an exercise
// @route   PUT /exercises/:id
// @access  Private/Admin
const updateExercise = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    instruction,
    video,
    image,
    category,
    subCategory,
    position,
    isPremium,
  } = req.body;

  const exercise = await Exercise.findById(req.params.id);

  if (exercise) {
    // Allow admins to update any exercise, others only custom exercises
    if (!req.user.role === 'isAdmin' && !exercise.isCustom) {
      res.status(403);
      throw new Error('Can only update custom exercises');
    }

    exercise.title = title || exercise.title;
    exercise.description = description || exercise.description;
    exercise.instruction = instruction || exercise.instruction;
    exercise.video = video || exercise.video;
    exercise.image = image || exercise.image;
    exercise.category = category || exercise.category;
    exercise.subCategory = subCategory || exercise.subCategory;
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
// @route   DELETE /exercises/:id
// @access  Private/Admin
const deleteExercise = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);

  if (exercise) {
    // Allow admins to delete any exercise, others only custom exercises
    if (!req.user.role === 'isAdmin' && !exercise.isCustom) {
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
  getAllExercises,
  getFeaturedExercises,
  getExercisesByCategory,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
}; 