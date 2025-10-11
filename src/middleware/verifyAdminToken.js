const jwt = require('jsonwebtoken');
const Admin = require('../modules/admin/auth/admin.model');
const sendResponse = require('../utils/sendResponse');

exports.verifyAdminToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return sendResponse({
                res,
                statusCode: 401,
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Check if token is for admin
        if (decoded.type !== 'access') {
            return sendResponse({
                res,
                statusCode: 401,
                success: false,
                message: 'Invalid token type.'
            });
        }
        
        // Find full admin data from database
        const admin = await Admin.findById(decoded.adminId).select('-password');
        
        if (!admin) {
            return sendResponse({
                res,
                statusCode: 401,
                success: false,
                message: 'Admin not found.'
            });
        }

        if (!admin.isActive) {
            return sendResponse({
                res,
                statusCode: 401,
                success: false,
                message: 'Account is deactivated.'
            });
        }

        // Put full admin object in req.admin
        req.admin = admin;
        next();
    } catch (error) {
        return sendResponse({
            res,
            statusCode: 401,
            success: false,
            message: 'Invalid token.'
        });
    }
};
