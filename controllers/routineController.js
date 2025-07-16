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
  
  // Extract query parameters for search, sort, and filter
  const {
    search = '',
    sortBy = 'name',
    sortOrder = 'asc',
    category = '',
    position = '',
    page = 1,
    limit = 10
  } = req.query;

  // Build the base query
  let query = { userId };

  // Build populate options
  const populateOptions = {
    path: 'exerciseId',
    select: 'title description instruction video image views favorites category subCategory position isPremium custom'
  };

  // If we have filters, we need to use aggregation pipeline for better performance
  if (search || category || position || sortBy !== 'name') {
    const pipeline = [
      // Match user's routines
      { $match: { userId } },
      
      // Lookup exercise data
      {
        $lookup: {
          from: 'exercises', // Assuming your exercise collection is named 'exercises'
          localField: 'exerciseId',
          foreignField: '_id',
          as: 'exercise'
        }
      },
      
      // Unwind the exercise array (since it's a single document)
      { $unwind: '$exercise' },
      
      // Apply search filter if provided
      ...(search ? [{
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { 'exercise.title': { $regex: search, $options: 'i' } },
            { 'exercise.category': { $regex: search, $options: 'i' } },
            { 'exercise.position': { $regex: search, $options: 'i' } },
            { 'exercise.description': { $regex: search, $options: 'i' } }
          ]
        }
      }] : []),
      
      // Apply category filter if provided
      ...(category ? [{
        $match: { 'exercise.category': { $regex: category, $options: 'i' } }
      }] : []),
      
      // Apply position filter if provided
      ...(position ? [{
        $match: { 'exercise.position': { $regex: position, $options: 'i' } }
      }] : []),
      
      // Add sorting
      {
        $sort: {
          ...(sortBy === 'name' && { name: sortOrder === 'asc' ? 1 : -1 }),
          ...(sortBy === 'category' && { 'exercise.category': sortOrder === 'asc' ? 1 : -1 }),
          ...(sortBy === 'position' && { 'exercise.position': sortOrder === 'asc' ? 1 : -1 }),
          ...(sortBy === 'reps' && { reps: sortOrder === 'asc' ? 1 : -1 }),
          ...(sortBy === 'hold' && { hold: sortOrder === 'asc' ? 1 : -1 }),
          ...(sortBy === 'complete' && { complete: sortOrder === 'asc' ? 1 : -1 }),
          ...(sortBy === 'updated' && { updatedAt: sortOrder === 'asc' ? 1 : -1 }),
          // Default fallback sort
          ...(sortBy === 'created' && { createdAt: sortOrder === 'asc' ? 1 : -1 })
        }
      },
      
      // Project the final structure
      {
        $project: {
          routineId: '$_id',
          name: 1,
          reps: 1,
          hold: 1,
          complete: 1,
          perform: 1,
          exercise: '$exercise',
          createdAt: 1,
          updatedAt: 1
        }
      }
    ];

    // Add pagination if limit is specified and > 0
    if (limit > 0) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: parseInt(limit) });
    }

    // Execute aggregation
    const routines = await Routine.aggregate(pipeline);
    
    // Get total count for pagination (without limit)
    const countPipeline = [...pipeline];
    // Remove skip and limit for count
    const skipIndex = countPipeline.findIndex(stage => stage.$skip);
    if (skipIndex !== -1) {
      countPipeline.splice(skipIndex, 2); // Remove both $skip and $limit
    }
    countPipeline.push({ $count: "total" });
    
    const countResult = await Routine.aggregate(countPipeline);
    const totalCount = countResult[0]?.total || 0;

    // Return 404 if no routines found and no search/filter applied
    if (!routines.length && !search && !category && !position) {
      res.status(404);
      throw new Error('No routines found for this user');
    }

    return res.status(200).json({
      success: true,
      count: routines.length,
      totalCount,
      currentPage: parseInt(page),
      totalPages: limit > 0 ? Math.ceil(totalCount / parseInt(limit)) : 1,
      hasNextPage: limit > 0 ? parseInt(page) < Math.ceil(totalCount / parseInt(limit)) : false,
      hasPrevPage: parseInt(page) > 1,
      data: routines
    });
  }

  // Simple query without filters - original logic
  const routines = await Routine.find(query)
    .populate(populateOptions)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
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
      createdAt: routine.createdAt,
      updatedAt: routine.updatedAt || routine.createdAt
    };
  });

  res.status(200).json({
    success: true,
    count: formattedRoutines.length,
    totalCount: formattedRoutines.length,
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    data: formattedRoutines
  });
});

// Additional helper endpoint to get unique filter values
const getRoutineFilters = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const pipeline = [
    { $match: { userId } },
    {
      $lookup: {
        from: 'exercises',
        localField: 'exerciseId',
        foreignField: '_id',
        as: 'exercise'
      }
    },
    { $unwind: '$exercise' },
    {
      $group: {
        _id: null,
        categories: { $addToSet: '$exercise.category' },
        positions: { $addToSet: '$exercise.position' }
      }
    },
    {
      $project: {
        _id: 0,
        categories: { $filter: { input: '$categories', cond: { $ne: ['$$this', null] } } },
        positions: { $filter: { input: '$positions', cond: { $ne: ['$$this', null] } } }
      }
    }
  ];

  const result = await Routine.aggregate(pipeline);
  const filters = result[0] || { categories: [], positions: [] };

  res.status(200).json({
    success: true,
    data: {
      categories: filters.categories.sort(),
      positions: filters.positions.sort()
    }
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