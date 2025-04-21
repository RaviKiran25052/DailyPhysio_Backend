const express = require('express')
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { loginAdmin } = require('../controllers/adminController')

// Public route for admin login
router.post('/login', loginAdmin);

// Protected admin routes can be added here
// Example: router.get('/dashboard', protect, isAdmin, getDashboardStats);

module.exports = router