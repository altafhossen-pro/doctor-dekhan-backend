const express = require('express');
const router = express.Router();
const prescriptionController = require('./prescription.controller');
const { verifyToken } = require('../../middleware/verifyToken');
const { verifyDoctorToken } = require('../../middleware/verifyDoctorToken');
const { verifyAdminToken } = require('../../middleware/verifyAdminToken');

// User routes (require user authentication)
router.use(verifyToken);

// Get user prescriptions
router.get('/user', prescriptionController.getUserPrescriptions);

// Get single prescription by ID (user can view their own prescriptions)
router.get('/:prescriptionId', prescriptionController.getPrescriptionById);

// Doctor routes (require doctor authentication)
router.use(verifyDoctorToken);

// Create prescription (doctor only)
router.post('/', prescriptionController.createPrescription);

// Get doctor prescriptions
router.get('/doctor/all', prescriptionController.getDoctorPrescriptions);

// Update prescription (doctor only)
router.patch('/:prescriptionId', prescriptionController.updatePrescription);

// Deactivate prescription (doctor only)
router.patch('/:prescriptionId/deactivate', prescriptionController.deactivatePrescription);

// Get prescription statistics (doctor only)
router.get('/doctor/stats', prescriptionController.getPrescriptionStats);

// Get prescriptions by date range (doctor only)
router.get('/doctor/date-range', prescriptionController.getPrescriptionsByDateRange);

// Search prescriptions (doctor only)
router.get('/doctor/search', prescriptionController.searchPrescriptions);

// Admin routes (require admin authentication)
router.use(verifyAdminToken);

// Get expired prescriptions (admin only)
router.get('/admin/expired', prescriptionController.getExpiredPrescriptions);

module.exports = router;
