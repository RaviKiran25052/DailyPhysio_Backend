const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { getFeaturedExercises } = require('../controllers/exerciseController');


router.get('/featured', getFeaturedExercises);
// Get trending therapists and exercises
router.get('/trending', publicController.getTrendingData);

module.exports = router; 