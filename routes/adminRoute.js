const express = require('express')
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const {
  loginAdmin,
  getAdminStats,
  getUsers,
  getAllTherapists,
  getTherapists,
  getTherapistById,
  updateTherapist,
  deleteTherapist,
  getConsultations,
  getConsultationsByTherapist,
  updateConsultationStatus,
  approveTherapist
} = require('../controllers/adminController')

// Public route for admin login
router.post('/login', loginAdmin);

// Protected admin routes - Dashboard
router.get('/stats', protect, isAdmin, getAdminStats);

// Protected admin routes - User Management
router.get('/users', protect, isAdmin, getUsers);

// Protected admin routes - Therapist Management
router.route('/therapists/all')
  .get(protect, isAdmin, getAllTherapists)

router.route('/therapists')
  .get(protect, isAdmin, getTherapists)

router.route('/therapists/:id')
  .get(protect, isAdmin, getTherapistById)
  .put(protect, isAdmin, updateTherapist)
  .delete(protect, isAdmin, deleteTherapist);

router.put('/therapists/:id/approve', protect, isAdmin, approveTherapist);
// Protected admin routes - Consultation Management
router.get('/consultations', protect, isAdmin, getConsultations);
router.get('/consultations/therapist/:id', protect, isAdmin, getConsultationsByTherapist);
router.put('/consultations/:id/status', protect, isAdmin, updateConsultationStatus);

module.exports = router