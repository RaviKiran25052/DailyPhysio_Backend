const express = require('express')
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const adminLogin = require('../controllers/adminController')

router.post('/loginAdmin', adminLogin)

module.exports = router