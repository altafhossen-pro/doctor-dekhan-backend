const Admin = require('../modules/admin/auth/admin.model');

const checkAdminPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Check if admin is authenticated
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Super admin has all permissions
      if (req.admin.role === 'super_admin') {
        return next();
      }

      // Check if admin has the required permission
      if (req.admin.role !== 'super_admin' && !req.admin.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

// Middleware to check if admin can manage another admin's role
const checkRoleManagementPermission = (targetRole) => {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Super admin can manage all roles
      if (req.admin.role === 'super_admin') {
        return next();
      }

      // Check if current admin can manage the target role
      if (!Admin.canManageRole(req.admin.role, targetRole)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage this role'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Role management permission check failed'
      });
    }
  };
};

// Middleware to check if admin can access specific resource
const checkResourceAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Super admin has access to all resources
      if (req.admin.role === 'super_admin') {
        return next();
      }

      // Check specific resource permissions
      const resourcePermissions = {
        'doctors': 'manage_doctors',
        'users': 'manage_users',
        'appointments': 'manage_appointments',
        'analytics': 'view_analytics',
        'settings': 'manage_settings',
        'logs': 'view_logs'
      };

      const requiredPermission = resourcePermissions[resourceType];
      
      if (!requiredPermission) {
        return res.status(400).json({
          success: false,
          message: 'Invalid resource type'
        });
      }

      if (req.admin.role !== 'super_admin' && !req.admin.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${requiredPermission}`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Resource access check failed'
      });
    }
  };
};

module.exports = {
  checkAdminPermission,
  checkRoleManagementPermission,
  checkResourceAccess
};
