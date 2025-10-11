const express = require('express');
const router = express.Router();
const doctorAdminController = require('./admin.doctor.controller');
const { verifyAdminToken } = require('../../../middleware/verifyAdminToken');
const { checkAdminPermission } = require('../../../middleware/checkAdminPermission');

// All routes require admin authentication
router.use(verifyAdminToken);

// Get all doctors with pagination and filters
router.get('/', 
  checkAdminPermission('manage_doctors'),
  doctorAdminController.getAllDoctors
);

// Get doctor statistics
router.get('/stats', 
  checkAdminPermission('manage_doctors'), 
  doctorAdminController.getDoctorStats
);

// Get single doctor by ID
router.get('/:doctorId', 
  checkAdminPermission('manage_doctors'), 
  doctorAdminController.getDoctorById
);

// Update doctor status (approve/reject)
router.put('/:doctorId/status', 
  checkAdminPermission('manage_doctors'), 
  doctorAdminController.updateDoctorStatus
);

// Delete doctor
router.delete('/:doctorId', 
  checkAdminPermission('manage_doctors'), 
  doctorAdminController.deleteDoctor
);

module.exports = router;