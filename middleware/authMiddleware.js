const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Therapist = require('../models/Therapist');

const protect = (role = 'user') => asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      switch (role) {
        case 'therapist': {
          const therapist = await Therapist.findById(decoded.id).select('-password');
          if (!therapist) {
            res.status(404);
            throw new Error('Therapist not found');
          }
          if (therapist.status !== 'active') {
            res.status(403);
            throw new Error('Access denied. Account is not active');
          }

          req.therapist = therapist;
          break;
        }

        case 'admin': {
          const user = await User.findById(decoded.id).select('-password');
          if (!user) {
            res.status(404);
            throw new Error('User not found');
          }
          if (user.role !== 'isAdmin') {
            res.status(403);
            throw new Error('Not authorized as an admin');
          }

          req.user = user;
          break;
        }

        case 'proUser': {
          const user = await User.findById(decoded.id).select('-password');
          if (!user) {
            res.status(404);
            throw new Error('User not found');
          }

          // Update membership status before checking
          const wasUpdated = user.updateMembershipStatus();
          if (wasUpdated) {
            await user.save();
          }

          // Get current active membership
          const currentMembership = user.getCurrentMembership();

          if (!currentMembership || currentMembership.type === 'free' || currentMembership.status !== 'active') {
            res.status(403);
            throw new Error('This route requires Pro user status');
          }

          req.user = user;
          break;
        }

        default: {
          const user = await User.findById(decoded.id).select('-password');

          if (!user) {
            res.status(404);
            throw new Error('User not found');
          }

          // Update membership status for regular users too
          const wasUpdated = user.updateMembershipStatus();
          if (wasUpdated) {
            await user.save();
          }

          req.user = user;
          break;
        }
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  } else {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const protectMultiRole = (roles = ['user']) => asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let roleFound = false;

      if (roles.includes('therapist')) {
        const therapist = await Therapist.findById(decoded.id).select('-password');
        if (therapist && therapist.status === 'active') {
          req.therapist = therapist;
          roleFound = true;
        }
      }

      if (!roleFound && (roles.includes('admin') || roles.includes('proUser') || roles.includes('user'))) {
        const user = await User.findById(decoded.id).select('-password');

        if (user) {
          // Update membership status before checking roles
          const wasUpdated = user.updateMembershipStatus();
          if (wasUpdated) {
            await user.save();
          }

          // Get current active membership
          const currentMembership = user.getCurrentMembership();

          if (roles.includes('admin') && user.role === 'isAdmin') {
            req.user = user;
            roleFound = true;
          } else if (roles.includes('proUser') && currentMembership && currentMembership.type !== 'free' && currentMembership.status === 'active') {
            req.user = user;
            roleFound = true;
          } else if (roles.includes('user')) {
            req.user = user;
            roleFound = true;
          }
        }
      }

      if (roleFound) {
        next();
      } else {
        res.status(403);
        throw new Error('Not authorized for this resource');
      }

    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  } else {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

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

      // Update membership status before checking access
      const wasUpdated = user.updateMembershipStatus();
      if (wasUpdated) {
        await user.save();
      }

      // Get current active membership
      const currentMembership = user.getCurrentMembership();

      if (currentMembership && currentMembership.type !== 'free' && currentMembership.status === 'active') {
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
  protect,
  protectMultiRole,
  checkPremiumAccess,

  // Convenience exports for common use cases
  protectUser: protect('user'),
  protectProUser: protect('proUser'),
  protectTherapist: protect('therapist'),
  protectAdmin: protect('admin'),

  // Common multi-role combinations
  protectAdminOrTherapist: protectMultiRole(['admin', 'therapist']),
  protectAll3: protectMultiRole(['proUser', 'admin', 'therapist'])
};