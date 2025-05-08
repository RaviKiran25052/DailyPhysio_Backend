const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const User = require('../models/User');
const Favorites = require('../models/Favorites');
const Exercise = require('../models/Exercise');
const Therapist = require('../models/Therapist');
const Followers = require('../models/Followers');

// @desc    Register a new user
// @route   POST /users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, creator } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    fullName,
    email,
    password,
    ...(creator && { creator })
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      pro: user.pro,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Auth user & get token
// @route   POST /users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      pro: user.pro,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get user profile
// @route   GET /users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.fullName = req.body.fullName || user.fullName;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      pro: updatedUser.pro,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Upgrade user to pro
// @route   POST /users/upgrade
// @access  Private
const upgradeUserToPro = asyncHandler(async (req, res) => {
  const { subscriptionType } = req.body;

  if (!subscriptionType || !['monthly', 'yearly'].includes(subscriptionType)) {
    res.status(400);
    throw new Error('Invalid subscription type');
  }

  const user = await User.findById(req.user._id);

  if (user) {
    user.pro.type = subscriptionType;
    user.pro.paymentDate = Date.now();

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      pro: updatedUser.pro,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get user favorites
// @route   GET /users/favorites
// @access  Private
const getFavoritesData = asyncHandler(async (req, res) => {
  // Find favorites by user ID
  const favorites = await Favorites.find({ userId: req.user._id }).populate('exerciseId');

  if (!favorites) {
    res.status(404);
    throw new Error('No favorites found');
  }

  // Return the populated exercises as favorites
  res.json(favorites.map(fav => fav.exerciseId));
});

const getFavorite = asyncHandler(async (req, res) => {
  const exerciseId = req.params.id;

  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }
  const userId = req.user._id;
  // send status, if the exercise is already in favorites with the userId
  const favorite = await Favorites.findOne({ userId, exerciseId });
  res.status(200).json({
    isFavorite: !!favorite,
    message: favorite ? 'Exercise is already in favorites' : 'Exercise is not in favorites'
  })
});

// @desc    Add an exercise to favorites
// @route   POST /users/favorites
// @access  Private
const addFavorite = asyncHandler(async (req, res) => {
  const { exerciseId } = req.body;

  if (!exerciseId) {
    res.status(400);
    throw new Error('Exercise ID is required');
  }

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

  if (favorite) {
    res.status(201).json({ message: 'Added to favorites', favorite });
  } else {
    res.status(400);
    throw new Error('Failed to add to favorites');
  }
});

// @desc    Remove an exercise from favorites
// @route   DELETE /users/favorites/:id
// @access  Private
const removeFavorite = asyncHandler(async (req, res) => {
  const exerciseId = req.params.id;

  // Find the favorite item
  const favorite = await Favorites.findOne({
    userId: req.user._id,
    exerciseId
  });

  if (!favorite) {
    res.status(404);
    throw new Error('Favorite not found');
  }

  // Remove from favorites
  await Favorites.deleteOne({ _id: favorite._id });

  // Decrement the favorites count in the Exercise schema
  await Exercise.findByIdAndUpdate(
    exerciseId,
    { $inc: { favorites: -1 } },
    { new: true }
  );

  res.json({ message: 'Removed from favorites' });
});

// @desc    Get therapists the user is following
// @route   GET /users/following
// @access  Private
const getFollowing = asyncHandler(async (req, res) => {

  // fetch all the therapists, in which the user is a followers array
  const followerFollowers = await Followers.find({
    followers: req.user._id
  });

  if (followerFollowers.length === 0) {
    return res.json([]);
  }

  // Extract therapist details
  const therapists = await Promise.all(
    followerFollowers.map(async (follow) => {
      const therapist = await Therapist.findById(follow.therapistId);
      return therapist;
    })
  );

  res.json(therapists);
});

// @desc    Follow a therapist
// @route   POST /users/following
// @access  Private
const followTherapist = asyncHandler(async (req, res) => {
  const { therapistId } = req.body;

  if (!therapistId) {
    res.status(400);
    throw new Error('Therapist ID is required');
  }

  // Check if therapist exists and is actually a therapist
  const therapist = await Therapist.findOne({ _id: therapistId });

  if (!therapist) {
    res.status(404);
    throw new Error('Therapist not found');
  }

  // Check if already following
  const existingFollow = await Followers.findOne({
    userId: req.user._id,
    therapistId
  });

  if (existingFollow) {
    res.status(400);
    throw new Error('Already following this therapist');
  }

  // Create following record
  const follow = await Followers.create({
    therapistId,
    followers: [req.user._id]
  });

  if (follow) {
    res.status(201).json({ message: 'Now following therapist', follow });
  } else {
    res.status(400);
    throw new Error('Failed to follow therapist');
  }
});

// @desc    Unfollow a therapist
// @route   DELETE /users/following/:therapistId
// @access  Private
const unfollowTherapist = asyncHandler(async (req, res) => {
  const { therapistId } = req.params;

  // Find the following relationship
  const follow = await Followers.findOne({
    userId: req.user._id,
    therapistId
  });

  if (!follow) {
    res.status(404);
    throw new Error('Not following this therapist');
  }

  // Remove the following relationship
  await Followers.deleteOne({ _id: follow._id });

  res.json({ message: 'Unfollowed therapist' });
});

// @desc    Get exercises from a therapist
// @route   GET /users/therapists/:therapistId/exercises
// @access  Private
const getTherapistExercises = asyncHandler(async (req, res) => {
  const { therapistId } = req.params;

  // Check if therapist exists
  const therapist = await Therapist.findOne({ _id: therapistId });
  if (!therapist) {
    res.status(404);
    throw new Error('Therapist not found');
  }

  // Check if user is following this therapist
  const isFollowing = await Followers.findOne({
    userId: req.user._id,
    therapistId
  });

  if (!isFollowing) {
    res.status(403);
    throw new Error('You must follow this therapist to see their exercises');
  }

  // Get exercises created by this therapist
  const exercises = await Exercise.find({
    'creator.createdBy': 'therapist',
    'creator.createdById': therapistId
  });

  res.json(exercises);
});

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  upgradeUserToPro,
  getFavoritesData,
  getFavorite,
  addFavorite,
  removeFavorite,
  getFollowing,
  followTherapist,
  unfollowTherapist,
  getTherapistExercises
}; 