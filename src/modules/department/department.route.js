const express = require('express');
const router = express.Router();
const departmentController = require('./department.controller');

// Public routes (no authentication required)
router.get('/', departmentController.getAllDepartments);
router.get('/stats', departmentController.getDepartmentStats);
router.get('/search', departmentController.searchDepartments);
router.get('/paginated', departmentController.getDepartmentsWithPagination);
router.get('/slug/:slug', departmentController.getDepartmentBySlug);
router.get('/:id', departmentController.getDepartmentById);

module.exports = router;