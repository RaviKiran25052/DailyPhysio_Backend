const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const { uploadToCloudinary } = require('../utils/cloudinary');
const User = require('../models/User');
const Favorites = require('../models/Favorites');
const Exercise = require('../models/Exercise');
const Therapist = require('../models/Therapist');
const Followers = require('../models/Followers');
const Consultation = require('../models/Consultation');

// Temporary OTP storage (in production, use Redis or database)
const tempOTPs = new Map();

// @desc    Register a new user
// @route   POST /users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, creator, otp } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Verify OTP from temporary storage
  const tempOTP = tempOTPs.get(email);
  if (!tempOTP || tempOTP.otp !== otp || tempOTP.expires < Date.now()) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  // Create user after OTP verification
  const user = await User.create({
    fullName,
    email,
    password,
    ...(creator && { creator })
  });

  if (user) {
    // Clean up temporary OTP after successful registration
    tempOTPs.delete(email);

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

// @desc    Send OTP (works for both existing and non-existing users)
// @route   POST /users/sendOTP
// @access  Public
const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if user exists
  const user = await User.findOne({ email });

  // Generate a random 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const expirationTime = Date.now() + 10 * 60 * 1000; // 10 minutes

  if (user) {
    // Store OTP in existing user document
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = expirationTime;
    await user.save();
  } else {
    // Store OTP in temporary storage for non-existing users
    tempOTPs.set(email, {
      otp,
      expires: expirationTime
    });
  }

  // Send email with OTP
  const nodemailer = require('nodemailer');

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'dailyphysio2025@gmail.com',
      pass: 'ocqs nxia dbsp kqsm'
    }
  });

  // Determine subject based on whether user exists
  const subject = user ? 'Reset password' : 'Verify your email';
  const purpose = user ? 'reset your password' : 'verify your email address';

  // Create email content with HTML
  const mailOptions = {
    from: 'dailyphysio2025@gmail.com',
    to: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b46c1;">${user ? 'Password Reset Request' : 'Email Verification'}</h2>
        <p>We received a request to ${purpose}. Please use the following OTP to complete the process:</p>
        <h1 style="font-size: 32px; color: #6b46c1; text-align: center; padding: 10px; background-color: #f7f7f7; border-radius: 5px;"><strong>${otp}</strong></h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email or contact support if you have concerns.</p>
        <p>Thank you,<br>The DailyPhysio Team</p>
      </div>
    `
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Email error:', error);
      res.status(500);
      throw new Error('Failed to send email');
    }
  });

  res.json({ message: 'OTP sent to email' });
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
    // Update text fields
    user.fullName = req.body.fullName || user.fullName;
    user.email = req.body.email || user.email;

    // Handle password update
    if (req.body.password) {
      user.password = req.body.password;
    }

    // Handle profile image upload
    if (req.file) {
      try {
        // Upload image to Cloudinary
        user.profileImage = await uploadToCloudinary(req.file, 'image', 'hep2go/images');

      } catch (uploadError) {
        res.status(500);
        throw new Error('Image upload failed');
      }
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      profileImage: updatedUser.profileImage,
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

// Fetch all users
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find({ role: "isUser" }).select('-password');

    const therapistIds = users
      .filter(u => u.creator.createdBy === 'therapist' && u.creator.createdById)
      .map(u => u.creator.createdById);

    const therapists = await Therapist.find({
      _id: { $in: therapistIds }
    }).select('name');

    const therapistMap = therapists.reduce((acc, t) => {
      acc[t._id.toString()] = t.name;
      return acc;
    }, {});

    const result = users.map(user => {
      const therapistName = user.creator.createdBy === 'therapist'
        ? therapistMap[user.creator.createdById] || null
        : null;

      return {
        ...user.toObject(),
        therapistName,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

const getConsultedExercises = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all consultations for the user and populate therapist and recommended exercises
    const consultations = await Consultation.find({
      patient_id: userId,
      'request.status': 'active' // Only get active consultations
    })
      .populate({
        path: 'therapist_id',
        select: 'name email profilePic gender specializations bio workingAt address phoneNumber experience followers'
      })
      .populate({
        path: 'recommendedExercises',
        select: 'title description instruction video image reps hold set perform category subCategory position isPremium views favorites'
      })
      .select('therapist_id recommendedExercises notes createdAt updatedAt request')
      .sort({ createdAt: -1 }); // Sort by newest first

    if (!consultations || consultations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active consultations found for this user'
      });
    }

    // Format the response data
    const consultedData = consultations.map(consultation => ({
      consultationId: consultation._id,
      therapist: consultation.therapist_id,
      recommendedExercises: consultation.recommendedExercises,
      notes: consultation.notes,
      consultationDate: consultation.createdAt,
      lastUpdated: consultation.updatedAt,
      status: consultation.request.status
    }));

    res.status(200).json({
      success: true,
      message: 'Consulted exercises retrieved successfully',
      consultedData
    });

  } catch (error) {
    console.error('Error fetching consulted exercises:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching consulted exercises',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const getMembership = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'user not found' });
    }

    // If membership field doesn't exist, return default free plan
    if (!user.membership) {
      return res.status(200).json({
        type: 'free',
        isActive: true,
        payments: []
      });
    }

    res.status(200).json(user.membership);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update therapist membership
const updateMembership = asyncHandler(async (req, res) => {
  try {
    const { type, paymentMethod } = req.body;
    const therapist = await Therapist.findById(req.therapist._id);

    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    // Calculate expiry date based on plan type
    const now = new Date();
    let expiresAt = null;
    let amount = 0;

    if (type === 'monthly') {
      expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      amount = 19.99;
    } else if (type === 'yearly') {
      expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      amount = 199.99;
    }

    // Create payment record for paid plans
    const payment = type !== 'free' ? {
      date: now,
      amount,
      plan: type,
      method: paymentMethod,
      status: 'completed'
    } : null;

    // Initialize membership if it doesn't exist
    if (!therapist.membership) {
      therapist.membership = {
        type,
        isActive: true,
        startedAt: now,
        expiresAt,
        payments: payment ? [payment] : []
      };
    } else {
      // Update existing membership
      therapist.membership.type = type;
      therapist.membership.isActive = true;
      therapist.membership.expiresAt = expiresAt;

      // Add payment record for paid plans
      if (payment) {
        if (!therapist.membership.payments) {
          therapist.membership.payments = [payment];
        } else {
          therapist.membership.payments.push(payment);
        }
      }
    }

    await therapist.save();
    res.status(200).json(therapist.membership);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Verify OTP for password reset
// @route   POST /users/verify-otp
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // Check if user exists
  const user = await User.findOne({
    email,
    resetPasswordOTP: otp,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  res.json({ message: 'OTP verified successfully' });
});

// @desc    Reset password with new password
// @route   POST /users/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  // Validate password match
  if (password !== confirmPassword) {
    res.status(400);
    throw new Error('Passwords do not match');
  }

  // Find user
  const user = await User.findOne({
    email,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Password reset session expired');
  }

  // Update password
  user.password = password;
  user.resetPasswordOTP = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: 'Password reset successful' });
});

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  upgradeUserToPro,
  getAllUsers,
  getFavoritesData,
  getFavorite,
  addFavorite,
  removeFavorite,
  getFollowing,
  followTherapist,
  unfollowTherapist,
  getTherapistExercises,
  getConsultedExercises,
  getMembership,
  updateMembership,
  sendOTP,
  verifyOTP,
  resetPassword
}; 