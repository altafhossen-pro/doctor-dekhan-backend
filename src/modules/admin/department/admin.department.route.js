const express = require('express');
const router = express.Router();
const adminDepartmentController = require('./admin.department.controller');
const { verifyAdminToken } = require('../../../middleware/verifyAdminToken');

// All routes require admin authentication
router.use(verifyAdminToken);

// Department management routes
router.get('/', adminDepartmentController.getAllDepartments);
router.get('/stats', adminDepartmentController.getDepartmentStats);
router.get('/:id', adminDepartmentController.getDepartmentById);
router.post('/', adminDepartmentController.createDepartment);
router.patch('/:id', adminDepartmentController.updateDepartment);
router.delete('/:id', adminDepartmentController.deleteDepartment);
router.patch('/:id/toggle-status', adminDepartmentController.toggleDepartmentStatus);

module.exports = router;
