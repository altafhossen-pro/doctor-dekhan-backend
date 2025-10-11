const express = require('express');
const router = express.Router();
const userAdminController = require('./admin.user.controller');
const { verifyAdminToken } = require('../../../middleware/verifyAdminToken');
const { checkAdminPermission } = require('../../../middleware/checkAdminPermission');

// All routes require admin authentication
router.use(verifyAdminToken);

// Get all users with pagination and filters
router.get('/', 
  checkAdminPermission('manage_users'),
  userAdminController.getAllUsers
);

// Get user statistics
router.get('/stats', 
  checkAdminPermission('manage_users'), 
  userAdminController.getUserStats
);

// Get single user by ID
router.get('/:userId', 
  checkAdminPermission('manage_users'), 
  userAdminController.getUserById
);

// Update user status (activate/deactivate, verify/unverify)
router.put('/:userId/status', 
  checkAdminPermission('manage_users'), 
  userAdminController.updateUserStatus
);

// Delete user
router.delete('/:userId', 
  checkAdminPermission('manage_users'), 
  userAdminController.deleteUser
);

module.exports = router;
