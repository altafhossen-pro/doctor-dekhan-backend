const Admin = require('./admin.model');
const jwt = require('jsonwebtoken');

// Create new admin
exports.createAdmin = async (adminData, createdBy = null) => {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [
        { email: adminData.email },
        { phone: adminData.phone }
      ]
    });

    if (existingAdmin) {
      throw new Error('Admin with this email or phone already exists');
    }

    // Set default permissions based on role
    if (!adminData.permissions || adminData.permissions.length === 0) {
      adminData.permissions = getDefaultPermissions(adminData.role);
    }

    // Set created by
    if (createdBy) {
      adminData.createdBy = createdBy;
    }

    const admin = new Admin(adminData);
    await admin.save();

    return {
      success: true,
      message: 'Admin created successfully',
      data: admin.getPublicProfile()
    };
  } catch (error) {
    throw error;
  }
};

// Admin login
exports.loginAdmin = async (identifier, password) => {
  try {
    // Find admin by email or phone
    const admin = await Admin.findByEmailOrPhone(identifier);
    
    if (!admin) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (admin.isLocked) {
      throw new Error('Account is temporarily locked due to multiple failed login attempts');
    }

    // Check if account is active
    if (!admin.isActive) {
      throw new Error('Account is deactivated');
    }

    // Compare password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await admin.incLoginAttempts();
      throw new Error('Invalid credentials');
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

    // Generate tokens
    const accessToken = admin.generateAccessToken();
    const refreshToken = admin.generateRefreshToken();

    return {
      success: true,
      message: 'Login successful',
      data: {
        admin: admin.getPublicProfile(),
        accessToken,
        refreshToken
      }
    };
  } catch (error) {
    throw error;
  }
};

// Refresh access token
exports.refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Find admin
    const admin = await Admin.findById(decoded.adminId);
    
    if (!admin || !admin.isActive) {
      throw new Error('Admin not found or inactive');
    }

    // Generate new access token
    const newAccessToken = admin.generateAccessToken();

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        admin: admin.getPublicProfile()
      }
    };
  } catch (error) {
    throw error;
  }
};

// Get admin profile
exports.getAdminProfile = async (adminId) => {
  try {
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      throw new Error('Admin not found');
    }

    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: admin.getPublicProfile()
    };
  } catch (error) {
    throw error;
  }
};

// Update admin profile
exports.updateAdminProfile = async (adminId, updateData) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'email', 'phone', 'profileImage'];
    const filteredData = {};
    
    // Only allow specific fields to be updated
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    // Check if email or phone already exists (excluding current admin)
    if (filteredData.email || filteredData.phone) {
      const existingAdmin = await Admin.findOne({
        $and: [
          { _id: { $ne: adminId } },
          {
            $or: [
              ...(filteredData.email ? [{ email: filteredData.email }] : []),
              ...(filteredData.phone ? [{ phone: filteredData.phone }] : [])
            ]
          }
        ]
      });

      if (existingAdmin) {
        throw new Error('Email or phone already exists');
      }
    }

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      filteredData,
      { new: true, runValidators: true }
    );

    if (!admin) {
      throw new Error('Admin not found');
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      data: admin.getPublicProfile()
    };
  } catch (error) {
    throw error;
  }
};

// Change password
exports.changePassword = async (adminId, currentPassword, newPassword) => {
  try {
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    return {
      success: true,
      message: 'Password changed successfully'
    };
  } catch (error) {
    throw error;
  }
};

// Get all admins (with pagination and filtering)
exports.getAllAdmins = async (filters = {}, page = 1, limit = 10) => {
  try {
    const query = {};
    
    // Apply filters
    if (filters.role) {
      query.role = filters.role;
    }
    
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    
    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const [admins, total] = await Promise.all([
      Admin.find(query)
        .select('-password')
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Admin.countDocuments(query)
    ]);

    return {
      success: true,
      message: 'Admins retrieved successfully',
      data: {
        admins: admins.map(admin => admin.getPublicProfile()),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalAdmins: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    };
  } catch (error) {
    throw error;
  }
};

// Update admin role and permissions
exports.updateAdminRole = async (adminId, role, permissions, updatedBy) => {
  try {
    // Check if the updater has permission to manage this role
    const updater = await Admin.findById(updatedBy);
    if (!updater) {
      throw new Error('Updater not found');
    }

    if (!Admin.canManageRole(updater.role, role)) {
      throw new Error('You do not have permission to assign this role');
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Check if trying to update a higher role
    if (!Admin.canManageRole(updater.role, admin.role)) {
      throw new Error('You cannot modify an admin with equal or higher role');
    }

    // Set default permissions if not provided
    if (!permissions || permissions.length === 0) {
      permissions = getDefaultPermissions(role);
    }

    admin.role = role;
    admin.permissions = permissions;
    await admin.save();

    return {
      success: true,
      message: 'Admin role updated successfully',
      data: admin.getPublicProfile()
    };
  } catch (error) {
    throw error;
  }
};

// Deactivate admin
exports.deactivateAdmin = async (adminId, deactivatedBy) => {
  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Check if trying to deactivate self
    if (adminId.toString() === deactivatedBy.toString()) {
      throw new Error('You cannot deactivate your own account');
    }

    // Check if the deactivator has permission
    const deactivator = await Admin.findById(deactivatedBy);
    if (!Admin.canManageRole(deactivator.role, admin.role)) {
      throw new Error('You do not have permission to deactivate this admin');
    }

    admin.isActive = false;
    await admin.save();

    return {
      success: true,
      message: 'Admin deactivated successfully',
      data: admin.getPublicProfile()
    };
  } catch (error) {
    throw error;
  }
};

// Activate admin
exports.activateAdmin = async (adminId, activatedBy) => {
  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Check if the activator has permission
    const activator = await Admin.findById(activatedBy);
    if (!Admin.canManageRole(activator.role, admin.role)) {
      throw new Error('You do not have permission to activate this admin');
    }

    admin.isActive = true;
    await admin.save();

    return {
      success: true,
      message: 'Admin activated successfully',
      data: admin.getPublicProfile()
    };
  } catch (error) {
    throw error;
  }
};

// Get default permissions for role
function getDefaultPermissions(role) {
  const permissions = {
    super_admin: [
      'manage_doctors',
      'manage_users',
      'manage_appointments',
      'view_analytics',
      'manage_settings',
      'manage_admins',
      'view_logs'
    ],
    admin: [
      'manage_doctors',
      'manage_users',
      'manage_appointments',
      'view_analytics',
      'view_logs'
    ],
    moderator: [
      'manage_doctors',
      'view_analytics'
    ]
  };

  return permissions[role] || [];
}

// Logout admin (invalidate refresh token)
exports.logoutAdmin = async (adminId) => {
  try {
    // In a real application, you might want to maintain a blacklist of tokens
    // For now, we'll just return success
    return {
      success: true,
      message: 'Logout successful'
    };
  } catch (error) {
    throw error;
  }
};
