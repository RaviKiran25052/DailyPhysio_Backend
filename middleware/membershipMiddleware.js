const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Therapist = require('../models/Therapist');

const checkPremiumAccess = asyncHandler(async (req, res, next) => {
  let token;
  req.accessType = 'normal';

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const therapist = await Therapist.findById(decoded.id).select('-password');
      if (therapist) {
        req.accessType = 'therapist';
        req.therapist = therapist;
        return next();
      }
      
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        req.accessType = 'normal';
        return next();
      }
      
      if (user.role === 'isAdmin') {
        req.accessType = 'admin';
        req.user = user;
        return next();
      }
      
      if (user.membership && user.membership.type && user.membership.type !== 'free') {
        req.accessType = 'premium';
        req.user = user;
      } else {
        req.accessType = 'normal';
        req.user = user;
      }
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      req.accessType = 'normal';
      next();
    }
  } else {
    req.accessType = 'normal';
    next();
  }
});

module.exports = { 
  checkPremiumAccess
};