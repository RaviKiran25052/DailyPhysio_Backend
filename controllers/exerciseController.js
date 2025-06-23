const asyncHandler = require('express-async-handler');
const Exercise = require('../models/Exercise');
const User = require('../models/User');
const Therapist = require('../models/Therapist');
const Followers = require('../models/Followers');
const { uploadMultipleFiles, uploadToCloudinary } = require('../utils/cloudinary');
const Routine = require('../models/Routine');
const Favorites = require('../models/Favorites');

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
  const { category, subcategory, position } = req.query;

  // Build query object
  const query = { 'custom.type': 'public' };
  if (req.accessType === 'normal') {
    query.isPremium = false;
  }
  if (category) query.category = category;
  if (subcategory) query.subCategory = subcategory;
  if (position) query.position = position;

  // Find exercises based on query
  const exercises = await Exercise.find(query);

  // Format response based on user type
  const formattedExercises = exercises.map(exercise => {
    const exerciseObj = exercise.toObject();

    // For normal users, remove videos from premium exercises
    if (req.accessType === 'normal' || exercise.isPremium) {
      exerciseObj.video = null;
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

  // First, try to find the creator in the therapists collection
  let creator = await Therapist.findById(creatorId);

  // If not found in therapists, check in users collection
  if (!creator) {
    creator = await User.findById(creatorId);
  }

  // If still not found, return 404
  if (!creator) {
    res.status(404);
    throw new Error('Creator not found');
  }

  // Find exercises created by this creator
  const exercises = await Exercise.find({
    'custom.creatorId': creatorId,
    'custom.type': 'public'
  });
  exercises.map(exercise => {
    if (req.accessType === 'normal' || exercise.isPremium) {
      exercise.video = null;
    }
  })
  res.json({ exercises, creatorData: creator });
});

const getFlatData = asyncHandler(async (req, res) => {
  try {
    // 1. Aggregate unique category-subCategory-position combinations
    const result = await Exercise.aggregate([
      {
        $match: req.accessType === 'premium' ? {} : { isPremium: false }
      },
      {
        $group: {
          _id: {
            category: "$category",
            subCategory: "$subCategory",
            position: "$position"
          }
        }
      },
      {
        $sort: {
          "_id.category": 1,
          "_id.subCategory": 1,
          "_id.position": 1
        }
      }
    ]);

    // 2. Fetch all exercises for 'All' key
    const allExercises = await Exercise.find(
      req.accessType === 'premium'
        ? {}
        : { isPremium: false }
    );

    // 3. Build categories map and collect positions
    const categoriesMap = {};
    const allPositions = new Set();

    result.forEach(item => {
      const { category, subCategory, position } = item._id;

      allPositions.add(position);

      if (!categoriesMap[category]) {
        categoriesMap[category] = {};
      }

      if (!categoriesMap[category][subCategory]) {
        categoriesMap[category][subCategory] = [];
      }

      if (!categoriesMap[category][subCategory].includes(position)) {
        categoriesMap[category][subCategory].push(position);
      }
    });

    // 4. Convert categoriesMap to desired object structure
    const categoriesObject = {
      All: allExercises // ✅ All key at the top with all exercises
    };

    Object.keys(categoriesMap).forEach(category => {
      const subCategoriesObj = categoriesMap[category];
      const subCategories = Object.keys(subCategoriesObj).map(subCategory => ({
        subCategory,
        positions: subCategoriesObj[subCategory]
      }));

      categoriesObject[category] = subCategories;
    });

    // 5. Convert positions to sorted array and add "All" at the beginning
    const sortedPositions = Array.from(allPositions).sort();
    const positionsWithAll = ['All', ...sortedPositions];

    // 6. Send final response
    return res.status(200).json({
      success: true,
      data: {
        categories: categoriesObject,  // includes "All" key first
        positions: positionsWithAll    // "All" key prepended
      }
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message
    });
  }
});

const getAllExercises = asyncHandler(async (req, res) => {
  const page = 1;
  const limit = 9;

  // Execute query with pagination
  const exercises = await Exercise.find()

  // Get total count for pagination metadata
  const totalExercises = await Exercise.countDocuments();

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalExercises / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Send response with pagination metadata
  res.json({
    exercises,
    pagination: {
      total: totalExercises,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  });
});

// @desc    Get exercise by ID with data formatting based on user type
// @route   GET /api/exercises/:id
// @access  Public (with different responses based on membership)
const getExerciseById = asyncHandler(async (req, res) => {
  const exerciseId = req.params.id;
  const isActive = req.query['consultedData[isActive]'];

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
  if (req.accessType === 'normal' || exercise.isPremium) {
    if (!isActive) {
      formattedExercise.video = null;
    }
  }
  // Get creator data
  let creatorData = null;
  if (exercise.custom.createdBy === 'therapist') {

    const therapist = await Therapist.findById(exercise.custom.creatorId);
    if (therapist) {
      // Check if user is following this therapist
      let isFollowing = false;
      if (req.user) {
        // Check in the Followers model if the user is following this therapist
        const followerData = await Followers.findOne({
          therapistId: therapist._id,
          followers: { $in: [req.user._id] }
        });

        if (followerData) {
          isFollowing = true;
        }
      }
      creatorData = {
        id: therapist._id,
        name: therapist.name,
        specializations: therapist.specializations,
        isFollowing: isFollowing,
        type: 'therapist'
      };
    }
  } else if (exercise.custom.createdBy === 'proUser') {
    const proUser = await User.findById(exercise.custom.creatorId);
    if (proUser) {
      // Check if user is following this proUser
      let isFollowing = false;
      if (req.user) {
        // Check in the Followers model if the user is following this proUser
        const followerData = await Followers.findOne({
          therapistId: proUser._id,
          followers: { $in: [req.user._id] }
        });

        if (followerData) {
          isFollowing = true;
        }
      }
      creatorData = {
        id: proUser._id,
        name: proUser.fullName,
        specializations: proUser.specializations || [],
        isFollowing: isFollowing,
        type: 'proUser'
      };
    }
  } else {
    // For admin or proUser created exercises, use default data
    creatorData = {
      id: exercise.custom.creatorId,
      name: 'Admin',
      specializations: [],
      isFollowing: false,
      type: 'admin'
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

  // Get current active membership for the user
  const currentMembership = req.user ? req.user.getCurrentMembership() : null;

  // Check authorization
  const isAuthorized =
    (req.user && currentMembership && currentMembership.type !== 'free' && currentMembership.status === 'active') || // Pro user
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
  } else if (req.user && currentMembership && currentMembership.type !== 'free' && currentMembership.status === 'active') {
    createdBy = 'proUser';
    creatorId = req.user._id;
  } else if (req.user && req.user.role === 'isAdmin') {
    createdBy = 'admin';
    creatorId = req.user._id;
  }

  let imageUrls = [];
  let videoUrl = null;

  if (req.files) {
    if (req.files.images) {
      imageUrls = await uploadMultipleFiles(req.files.images, 'image', 'hep2go/images');
    }

    if (req.files.video) {
      videoUrl = await uploadToCloudinary(req.files.video[0], 'video', 'hep2go/videos');
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
    video: videoUrl,
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
    isPremium,
    custom
  } = req.body;

  // Handle file uploads (images and videos)
  let imageUrls = [...(exercise.image || [])];
  let videoUrl = null;

  if (req.files) {
    if (req.files.images) {
      const newImages = await uploadMultipleFiles(req.files.images, 'image', 'hep2go/images');
      imageUrls = [...imageUrls, ...newImages];
    }

    if (req.files.video) {
      const newVideo = await uploadToCloudinary(req.files.video[0], 'video', 'hep2go/videos');
      videoUrl = newVideo;
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
  if (videoUrl !== null) {
    exercise.video = videoUrl;
  }
  exercise.category = category || exercise.category;
  exercise.subCategory = subCategory || exercise.subCategory;
  exercise.position = position || exercise.position;
  exercise.isPremium = isPremium !== undefined ? isPremium : exercise.isPremium;
  exercise.custom = { ...exercise.custom, type: custom.type } || exercise.custom;

  const updatedExercise = await exercise.save();

  res.json(updatedExercise);
});

const deleteExercise = asyncHandler(async (req, res) => {
  const exerciseId = req.params.id;
  const exercise = await Exercise.findById(exerciseId);
  const routineEx = await Routine.deleteMany({ exerciseId: exerciseId });
  const FavoriteEx = await Favorites.deleteMany({ exerciseId: exerciseId });

  if (!exercise) {
    res.status(404);
    throw new Error('Exercise not found');
  }

  const requesterId = req.therapist ? req.therapist._id : req.user._id;
  const isAdmin = req.user && req.user.role === 'isAdmin';

  if (exercise.custom.creatorId.toString() !== requesterId.toString() && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to delete this exercise');
  }

  if (routineEx) {
    await Routine.findByIdAndDelete(exerciseId);
  }
  if (FavoriteEx) {
    await Favorites.findByIdAndDelete(exerciseId);
  }
  await Exercise.findByIdAndDelete(exerciseId);

  res.status(200).json({
    success: true,
    message: "Exercise deleted successfully"
  });
});

module.exports = {
  getFeaturedExercises,
  filterExercises,
  getExercisesByCreator,
  getFlatData,
  getAllExercises,
  getExerciseById,
  createExercise,
  editExercise,
  deleteExercise
};
