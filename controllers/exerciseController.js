const asyncHandler = require('express-async-handler');
const Exercise = require('../models/Exercise');
const User = require('../models/User');
const Therapist = require('../models/Therapist');
const Followers = require('../models/Followers');
const Favorites = require('../models/Favorites');
const { uploadMultipleFiles } = require('../utils/cloudinary');

// @desc    Get exercise by ID with data formatting based on user type
// @route   GET /api/exercises/:id
// @access  Public (with different responses based on membership)
const getExerciseById = asyncHandler(async (req, res) => {
  const exerciseId = req.params.id;
  
  // Find the exercise by ID
  const exercise = await Exercise.findById(exerciseId);
  
  if (!exercise) {
    res.status(404);
    throw new Error('Exercise not found');
  }
  
  // Increment views
  exercise.views += 1;
  await exercise.save();
  
  // Format response based on user type
  let formattedExercise = { ...exercise.toObject() };
  
  // For normal users (non-pro), remove videos and check premium status
  if (req.userType === 'normal' && exercise.isPremium) {
    formattedExercise.video = [];
  }
  
  // Get creator data
  let creatorData = null;
  if (exercise.custom.createdBy === 'therapist') {
    const therapist = await Therapist.findById(exercise.custom.creatorId);
    if (therapist) {
      // Check if user is following this therapist
      let isFollowing = false;
      
      if (req.user) {
        const followerData = await Followers.findOne({ 
          therapistId: exercise.custom.creatorId,
          followers: { $in: [req.user._id] }
        });
        isFollowing = !!followerData;
      }
      
      creatorData = {
        id: therapist._id,
        name: therapist.name,
        specializations: therapist.specializations,
        following: isFollowing
      };
    }
  } else {
    // For admin or proUser created exercises, use default data
    creatorData = {
      id: exercise.custom.creatorId,
      name: 'HEP Admin',
      specializations: ['Physical Therapy'],
      following: false
    };
  }
  
  // Get related exercises based on category
  const relatedExercises = await Exercise.find({ 
    category: exercise.category,
    _id: { $ne: exercise._id },
    'custom.type': 'public' 
  })
  .limit(5)
  .select('title image category');
  
  res.json({
    exercise: formattedExercise,
    creatorData,
    relatedExercises
  });
});

// @desc    Get featured exercises (1 from each category)
// @route   GET /api/exercises/featured
// @access  Public
const getFeaturedExercises = asyncHandler(async (req, res) => {
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
  
  const featuredExercises = [];
  
  // Get one exercise from each category
  for (const category of categories) {
    const exercise = await Exercise.findOne({ 
      category,
      'custom.type': 'public'
    })
    .sort({ views: -1 })
    .limit(1);
    
    if (exercise) {
      featuredExercises.push(exercise);
    }
  }
  
  res.json(featuredExercises);
});

// @desc    Filter exercises based on query parameters
// @route   GET /api/exercises/filters
// @access  Public (with different responses based on membership)
const filterExercises = asyncHandler(async (req, res) => {
  const { category, subcategory, position, search } = req.query;
  
  // Build query object
  const query = { 'custom.type': 'public' };
  
  if (category) query.category = category;
  if (subcategory) query.subCategory = subcategory;
  if (position) query.position = position;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Find exercises based on query
  const exercises = await Exercise.find(query);
  
  // Format response based on user type
  const formattedExercises = exercises.map(exercise => {
    const exerciseObj = exercise.toObject();
    
    // For normal users, remove videos from premium exercises
    if (req.userType === 'normal' && exercise.isPremium) {
      exerciseObj.video = [];
    }
    
    return exerciseObj;
  });
  
  res.json(formattedExercises);
});

// @desc    Get exercises by creator ID
// @route   GET /api/exercises/creator/:id
// @access  Public
const getExercisesByCreator = asyncHandler(async (req, res) => {
  const creatorId = req.params.id;
  
  const exercises = await Exercise.find({ 
    'custom.creatorId': creatorId,
    'custom.type': 'public'
  });
  
  // Format response based on user type
  const formattedExercises = exercises.map(exercise => {
    const exerciseObj = exercise.toObject();
    
    // For normal users, remove videos from premium exercises
    if (req.userType === 'normal' && exercise.isPremium) {
      exerciseObj.video = [];
    }
    
    return exerciseObj;
  });
  
  res.json(formattedExercises);
});

// @desc    Add exercise to favorites
// @route   POST /api/exercises/favorite/:exId
// @access  Private
const addToFavorites = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }
  
  const exerciseId = req.params.exId;
  
  // Check if exercise exists
  const exercise = await Exercise.findById(exerciseId);
  if (!exercise) {
    res.status(404);
    throw new Error('Exercise not found');
  }
  
  // Check if already in favorites
  const existingFavorite = await Favorites.findOne({
    userId: req.user._id,
    exerciseId
  });
  
  if (existingFavorite) {
    res.status(400);
    throw new Error('Exercise already in favorites');
  }
  
  // Add to favorites
  const favorite = await Favorites.create({
    userId: req.user._id,
    exerciseId
  });
  
  // Increment favorites count
  exercise.favorites += 1;
  await exercise.save();
  
  res.status(201).json({ message: 'Added to favorites' });
});

// @desc    Create a new exercise
// @route   POST /api/exercises/add
// @access  Private (Pro Users, Therapists, Admins only)
const createExercise = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    instruction,
    reps,
    hold,
    set,
    perform,
    category,
    subCategory,
    position,
    isPremium
  } = req.body;
  
  // Check authorization
  const isAuthorized = 
    (req.user && req.user.membership.type !== 'free') || // Pro user
    req.therapist || // Therapist
    (req.user && req.user.role === 'isAdmin'); // Admin
  
  if (!isAuthorized) {
    res.status(403);
    throw new Error('Not authorized to create exercises');
  }
  
  // Determine creator type and ID
  let createdBy = 'admin';
  let creatorId = null; // Default admin ID
  
  if (req.therapist) {
    createdBy = 'therapist';
    creatorId = req.therapist._id;
  } else if (req.user && req.user.membership.type !== 'free') {
    createdBy = 'proUser';
    creatorId = req.user._id;
  } else if (req.user && req.user.role === 'isAdmin') {
    createdBy = 'admin';
    creatorId = req.user._id;
  }
  
  // Handle file uploads (images and videos)
  let imageUrls = [];
  let videoUrls = [];
  
  if (req.files) {
    if (req.files.images) {
      imageUrls = await uploadMultipleFiles(req.files.images, 'image', 'hep2go/images');
    }
    
    if (req.files.videos) {
      videoUrls = await uploadMultipleFiles(req.files.videos, 'video', 'hep2go/videos');
    }
  }
  
  // Create the exercise
  const exercise = await Exercise.create({
    title,
    description,
    instruction,
    reps: reps || 1,
    hold: hold || 1,
    set: set || 1,
    perform: perform || { count: 1, type: 'day' },
    video: videoUrls,
    image: imageUrls,
    category,
    subCategory,
    position,
    isPremium: isPremium || false,
    custom: {
      createdBy,
      type: 'public',
      creatorId
    }
  });
  
  res.status(201).json(exercise);
});

// @desc    Edit an existing exercise
// @route   PUT /api/exercises/edit/:id
// @access  Private (Creator of exercise, Admin)
const editExercise = asyncHandler(async (req, res) => {
  const exerciseId = req.params.id;
  
  // Find the exercise
  const exercise = await Exercise.findById(exerciseId);
  
  if (!exercise) {
    res.status(404);
    throw new Error('Exercise not found');
  }
  
  // Check authorization
  let isAuthorized = false;
  
  if (req.user && req.user.role === 'isAdmin') {
    // Admin can edit any exercise
    isAuthorized = true;
  } else if (req.therapist && exercise.custom.createdBy === 'therapist' && 
             exercise.custom.creatorId.toString() === req.therapist._id.toString()) {
    // Therapist can edit their own exercises
    isAuthorized = true;
  } else if (req.user && exercise.custom.createdBy === 'proUser' && 
             exercise.custom.creatorId.toString() === req.user._id.toString()) {
    // Pro user can edit their own exercises
    isAuthorized = true;
  }
  
  if (!isAuthorized) {
    res.status(403);
    throw new Error('Not authorized to edit this exercise');
  }
  
  // Extract fields from request
  const {
    title,
    description,
    instruction,
    reps,
    hold,
    set,
    perform,
    category,
    subCategory,
    position,
    isPremium
  } = req.body;
  
  // Handle file uploads (images and videos)
  let imageUrls = [...(exercise.image || [])];
  let videoUrls = [...(exercise.video || [])];
  
  if (req.files) {
    if (req.files.images) {
      const newImages = await uploadMultipleFiles(req.files.images, 'image', 'hep2go/images');
      imageUrls = [...imageUrls, ...newImages];
    }
    
    if (req.files.videos) {
      const newVideos = await uploadMultipleFiles(req.files.videos, 'video', 'hep2go/videos');
      videoUrls = [...videoUrls, ...newVideos];
    }
  }
  
  // Update the exercise
  exercise.title = title || exercise.title;
  exercise.description = description || exercise.description;
  exercise.instruction = instruction || exercise.instruction;
  exercise.reps = reps || exercise.reps;
  exercise.hold = hold || exercise.hold;
  exercise.set = set || exercise.set;
  exercise.perform = perform || exercise.perform;
  exercise.image = imageUrls;
  exercise.video = videoUrls;
  exercise.category = category || exercise.category;
  exercise.subCategory = subCategory || exercise.subCategory;
  exercise.position = position || exercise.position;
  exercise.isPremium = isPremium !== undefined ? isPremium : exercise.isPremium;
  
  const updatedExercise = await exercise.save();
  
  res.json(updatedExercise);
});

module.exports = {
  getExerciseById,
  getFeaturedExercises,
  filterExercises,
  getExercisesByCreator,
  addToFavorites,
  createExercise,
  editExercise
};
