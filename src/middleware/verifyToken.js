const User = require('../modules/user/user.model');
const userService = require('../modules/user/user.services');
const sendResponse = require('../utils/sendResponse');

exports.verifyToken = async (req, res, next) => {
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

        // Verify access token using the service method
        const decoded = userService.verifyAccessToken(token);
        
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

        // Put full user object in req.user
        req.user = user;
        next();
    } catch (error) {
        return sendResponse({
            res,
            statusCode: 401,
            success: false,
            message: 'Invalid or expired access token.'
        });
    }
};
