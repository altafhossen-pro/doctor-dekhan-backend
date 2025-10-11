const adminService = require('./admin.service');
const sendResponse = require('../../../utils/sendResponse');

// Register new admin (only super_admin can create other admins)
exports.registerAdmin = async (req, res) => {
  try {
    const adminData = req.body;
    const createdBy = req.admin._id;

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'password', 'role'];
    const missingFields = requiredFields.filter(field => !adminData[field]);
    
    if (missingFields.length > 0) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate role
    const validRoles = ['super_admin', 'admin', 'moderator'];
    if (!validRoles.includes(adminData.role)) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: 'Invalid role. Must be one of: super_admin, admin, moderator'
      });
    }

    const result = await adminService.createAdmin(adminData, createdBy);
    
    sendResponse({
      res,
      statusCode: 201,
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: error.message
    });
  }
};

// Admin login
exports.loginAdmin = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: 'Email/phone and password are required'
      });
    }

    const result = await adminService.loginAdmin(identifier, password);
    
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    sendResponse({
      res,
      statusCode: 401,
      success: false,
      message: error.message
    });
  }
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: 'Refresh token is required'
      });
    }

    const result = await adminService.refreshAccessToken(refreshToken);
    
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    sendResponse({
      res,
      statusCode: 401,
      success: false,
      message: error.message
    });
  }
};

// Get admin profile
exports.getProfile = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const result = await adminService.getAdminProfile(adminId);
    
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: error.message
    });
  }
};

// Update admin profile
exports.updateProfile = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const updateData = req.body;
    
    const result = await adminService.updateAdminProfile(adminId, updateData);
    
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: error.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin._id;
    
    if (!currentPassword || !newPassword) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const result = await adminService.changePassword(adminId, currentPassword, newPassword);
    
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: result.message
    });
  } catch (error) {
    sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: error.message
    });
  }
};

// Get all admins (with pagination and filtering)
exports.getAllAdmins = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      role, 
      isActive, 
      search 
    } = req.query;
    
    const filters = {};
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;
    
    const result = await adminService.getAllAdmins(filters, parseInt(page), parseInt(limit));
    
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: error.message
    });
  }
};

// Update admin role and permissions
exports.updateAdminRole = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { role, permissions } = req.body;
    const updatedBy = req.admin._id;
    
    if (!role) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: 'Role is required'
      });
    }

    const validRoles = ['super_admin', 'admin', 'moderator'];
    if (!validRoles.includes(role)) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: 'Invalid role. Must be one of: super_admin, admin, moderator'
      });
    }

    const result = await adminService.updateAdminRole(adminId, role, permissions, updatedBy);
    
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: error.message
    });
  }
};

// Deactivate admin
exports.deactivateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const deactivatedBy = req.admin._id;
    
    const result = await adminService.deactivateAdmin(adminId, deactivatedBy);
    
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: error.message
    });
  }
};

// Activate admin
exports.activateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const activatedBy = req.admin._id;
    
    const result = await adminService.activateAdmin(adminId, activatedBy);
    
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: error.message
    });
  }
};

// Logout admin
exports.logoutAdmin = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const result = await adminService.logoutAdmin(adminId);
    
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: result.message
    });
  } catch (error) {
    sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: error.message
    });
  }
};

// Get admin by ID
exports.getAdminById = async (req, res) => {
  try {
    const { adminId } = req.params;
    const result = await adminService.getAdminProfile(adminId);
    
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: error.message
    });
  }
};
