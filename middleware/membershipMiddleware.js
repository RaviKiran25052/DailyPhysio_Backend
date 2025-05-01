const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Middleware to check user membership type
const checkMembership = asyncHandler(async (req, res, next) => {
  let token;
  
  // Set default user type as normal (non-pro)
  req.userType = 'normal';

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id).select('-password');
      
      // Check if user exists
      if (!user) {
        // Treat as normal user if not found
        req.userType = 'normal';
        return next();
      }
      
      // Check membership type
      if (user.membership.type === 'monthly' || user.membership.type === 'yearly') {
        // User is a pro user
        req.userType = 'pro';
        req.user = user;
      } else {
        // User with free membership is a normal user
        req.userType = 'normal';
        req.user = user;
      }
      
      next();
    } catch (error) {
      // If token verification fails, treat as normal user
      req.userType = 'normal';
      next();
    }
  } else {
    // No token, treat as normal user
    req.userType = 'normal';
    next();
  }
});

module.exports = { checkMembership }; 