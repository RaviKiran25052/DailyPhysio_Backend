const express = require('express')
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { loginAdmin, getAdminStats } = require('../controllers/adminController')

// Public route for admin login
router.post('/login', loginAdmin);

// Protected admin routes
router.get('/stats', protect, isAdmin, getAdminStats);

module.exports = router