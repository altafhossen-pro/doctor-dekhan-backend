const userService = require('./admin.user.service');
const sendResponse = require('../../../utils/sendResponse');

// Get all users with pagination and filters
exports.getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = 'all',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const result = await userService.getAllUsersForAdmin({
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            status,
            sortBy,
            sortOrder
        });

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Users retrieved successfully',
            data: result
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

// Get single user by ID
exports.getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userService.getUserById(userId);

        if (!user) {
            return sendResponse({
                res,
                statusCode: 404,
                success: false,
                message: 'User not found'
            });
        }

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'User retrieved successfully',
            data: { user }
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

// Update user status (activate/deactivate, verify/unverify)
exports.updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive, isVerified } = req.body;

        if (isActive === undefined && isVerified === undefined) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'At least one status field (isActive or isVerified) is required'
            });
        }

        const updatedUser = await userService.updateUserStatus(userId, {
            isActive,
            isVerified,
            updatedBy: req.admin._id
        });

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'User status updated successfully',
            data: { user: updatedUser }
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

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const deletedUser = await userService.deleteUser(userId);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'User deleted successfully',
            data: { user: deletedUser }
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

// Get user statistics
exports.getUserStats = async (req, res) => {
    try {
        const stats = await userService.getUserStats();

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'User statistics retrieved successfully',
            data: stats
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
