const express = require('express')
const router = express.Router();
const { protectAdmin } = require('../middleware/authMiddleware');
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
  approveTherapist,
  getDashboardAnalytics
} = require('../controllers/adminController')

// Public route for admin login
router.post('/login', loginAdmin);

// Protected admin routes - Dashboard
router.get('/stats', protectAdmin, getAdminStats);

router.get('/analytics', protectAdmin, getDashboardAnalytics);

// Protected admin routes - User Management
router.get('/users', protectAdmin, getUsers);

// Protected admin routes - Therapist Management
router.route('/therapists/all')
  .get(protectAdmin, getAllTherapists)

router.route('/therapists')
  .get(protectAdmin, getTherapists)

router.route('/therapists/:id')
  .get(protectAdmin, getTherapistById)
  .put(protectAdmin, updateTherapist)
  .delete(protectAdmin, deleteTherapist);

router.put('/therapists/:id/approve', protectAdmin, approveTherapist);
// Protected admin routes - Consultation Management
router.get('/consultations', protectAdmin, getConsultations);
router.get('/consultations/therapist/:id', protectAdmin, getConsultationsByTherapist);
router.put('/consultations/:id/status', protectAdmin, updateConsultationStatus);

module.exports = router