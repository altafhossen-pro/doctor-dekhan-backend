const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { verifyAdminToken } = require('../../../middleware/verifyAdminToken');
const { checkAdminPermission } = require('../../../middleware/checkAdminPermission');

// Public routes (no authentication required)
router.post('/login', adminController.loginAdmin);
router.post('/refresh-token', adminController.refreshToken);

// Protected routes (authentication required)
router.use(verifyAdminToken);

// Profile management routes
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);
router.put('/change-password', adminController.changePassword);
router.post('/logout', adminController.logoutAdmin);

// Admin management routes (require specific permissions)
router.post('/register', 
  checkAdminPermission('manage_admins'), 
  adminController.registerAdmin
);

router.get('/all', 
  checkAdminPermission('manage_admins'), 
  adminController.getAllAdmins
);

router.get('/:adminId', 
  checkAdminPermission('manage_admins'), 
  adminController.getAdminById
);

router.put('/:adminId/role', 
  checkAdminPermission('manage_admins'), 
  adminController.updateAdminRole
);

router.put('/:adminId/deactivate', 
  checkAdminPermission('manage_admins'), 
  adminController.deactivateAdmin
);

router.put('/:adminId/activate', 
  checkAdminPermission('manage_admins'), 
  adminController.activateAdmin
);

module.exports = router;
