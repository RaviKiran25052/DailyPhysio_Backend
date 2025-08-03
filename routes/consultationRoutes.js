const express = require('express');
const router = express.Router();
const consultationController = require('../controllers/consultationController');

router.get('/:id', consultationController.getConsultationByID);

module.exports = router;