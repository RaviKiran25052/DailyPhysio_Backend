const express = require('express');
const router = express.Router();
const consultationController = require('../controllers/consultationController');

router.get('/:id', consultationController.getConsultationByID);
router.get('/exercise/:id', consultationController.getConsultedExerciseByID);

module.exports = router;