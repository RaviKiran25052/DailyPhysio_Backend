const express = require('express')
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { loginAdmin, getAdminStats, getUsers } = require('../controllers/adminController')

// Public route for admin login
router.post('/login', loginAdmin);

// Protected admin routes
router.get('/stats', protect, isAdmin, getAdminStats);
router.get('/users', protect, isAdmin, getUsers);

module.exports = router