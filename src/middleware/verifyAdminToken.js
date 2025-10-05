const jwt = require('jsonwebtoken');
const User = require('../modules/user/user.model');
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
        
        // Find full user data from database
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return sendResponse({
                res,
                statusCode: 401,
                success: false,
                message: 'User not found.'
            });
        }

        if (!user.isActive) {
            return sendResponse({
                res,
                statusCode: 401,
                success: false,
                message: 'Account is deactivated.'
            });
        }

        // Check if user is admin
        if (user.role !== 'admin') {
            return sendResponse({
                res,
                statusCode: 403,
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        // Put full user object in req.user
        req.user = user;
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
