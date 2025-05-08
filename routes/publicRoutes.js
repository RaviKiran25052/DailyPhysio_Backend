const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Get trending therapists and exercises
router.get('/trending', publicController.getTrendingData);

module.exports = router; 