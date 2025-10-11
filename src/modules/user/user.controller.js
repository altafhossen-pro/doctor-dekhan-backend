const userService = require('./user.services');
const OTP = require('../otp/otp.model');
const sendResponse = require('../../utils/sendResponse');
const { sendEmail } = require('../../utils/email');

// Helper function to normalize phone number
const normalizePhone = (phone) => {
    if (phone.startsWith('+88')) {
        return phone.substring(3);
    } else if (phone.startsWith('88')) {
        return phone.substring(2);
    }
    return phone;
};

// Send OTP to phone number
exports.sendOTP = async (req, res) => {
        try {
            const { phone } = req.body;

            // Validate phone number format
            const phoneRegex = /^(\+88|88)?01[3-9]\d{8}$/;
            if (!phone || !phoneRegex.test(phone)) {
                return sendResponse({
                    res,
                    statusCode: 400,
                    success: false,
                    message: 'Please provide a valid Bangladesh mobile number (01XXXXXXXXX)'
                });
            }

            // Normalize phone number
            const normalizedPhone = normalizePhone(phone);

            // Call service method
            const result = await userService.sendOTP(normalizedPhone);

            sendResponse({
                res,
                statusCode: 200,
                success: result.success,
                message: result.message,
                data: result.data
            });

        } catch (error) {
            if (error.message.includes('This phone number is already registered. Please try again with another number.')) {
                return sendResponse({
                    res,
                    statusCode: 400,
                    success: false,
                    message: error.message
                });
            }
            sendResponse({
                res,
                statusCode: 500,
                success: false,
                message: error.message || 'Failed to send OTP'
            });
        }
    };

// Send OTP for registration (checks if user already exists)
exports.sendRegisterOTP = async (req, res) => {
    try {
        const { phone } = req.body;

        // Validate phone number format
        const phoneRegex = /^(\+88|88)?01[3-9]\d{8}$/;
        if (!phone || !phoneRegex.test(phone)) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Please provide a valid Bangladesh mobile number (01XXXXXXXXX)'
            });
        }

        // Normalize phone number
        const normalizedPhone = normalizePhone(phone);

        // Call service method
        const result = await userService.sendRegisterOTP(normalizedPhone);

        // If user already exists, return 400 with specific message
        if (!result.success && result.data?.userExists) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: result.message,
                data: result.data
            });
        }

        // If successful, return 200
        sendResponse({
            res,
            statusCode: 200,
            success: result.success,
            message: result.message,
            data: result.data
        });

    } catch (error) {
        if (error.message.includes('already registered as a doctor')) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: error.message
            });
        }

        sendResponse({
            res,
            statusCode: 500,
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Verify OTP and check if user exists
exports.verifyOTP = async (req, res) => {
        try {
            const { phone, otp } = req.body;

            // Validate inputs
            if (!phone || !otp) {
                return sendResponse({
                    res,
                    statusCode: 400,
                    success: false,
                    message: 'Phone number and OTP are required'
                });
            }

            // Normalize phone number
            const normalizedPhone = normalizePhone(phone);

            // Call service method
            const result = await userService.verifyOTP(normalizedPhone, otp);

            sendResponse({
                res,
                statusCode: 200,
                success: result.success,
                message: result.message,
                data: result.data
            });

        } catch (error) {
            sendResponse({
                res,
                statusCode: 500,
                success: false,
                message: error.message || 'Failed to verify OTP'
            });
        }
    };

// Complete user registration with name
exports.completeRegistration = async (req, res) => {
        try {
            const { phone, name } = req.body;

            // Validate inputs
            if (!phone || !name) {
                return sendResponse({
                    res,
                    statusCode: 400,
                    success: false,
                    message: 'Phone number and name are required'
                });
            }

            // Normalize phone number
            const normalizedPhone = normalizePhone(phone);

            // Validate name
            if (name.trim().length < 2) {
                return sendResponse({
                    res,
                    statusCode: 400,
                    success: false,
                    message: 'Name must be at least 2 characters long'
                });
            }

            // Call service method
            const result = await userService.completeRegistration(normalizedPhone, name);

            sendResponse({
                res,
                statusCode: 201,
                success: result.success,
                message: result.message,
                data: result.data
            });

        } catch (error) {
            sendResponse({
                res,
                statusCode: 500,
                success: false,
                message: error.message || 'Failed to complete registration'
            });
        }
    };

// Get user profile
exports.getUserProfile = async (req, res) => {
        try {
            const userId = req.user._id;
            const result = await userService.getUserProfile(userId);

            sendResponse({
                res,
                statusCode: 200,
                success: result.success,
                message: result.message,
                data: result.data
            });

        } catch (error) {
            sendResponse({
                res,
                statusCode: 500,
                success: false,
                message: error.message || 'Failed to get user profile'
            });
        }
    };

// Update user profile
exports.updateUserProfile = async (req, res) => {
        try {
            const userId = req.user._id;
            const updateData = req.body;

            const result = await userService.updateUserProfile(userId, updateData);

            sendResponse({
                res,
                statusCode: 200,
                success: result.success,
                message: result.message,
                data: result.data
            });

        } catch (error) {
            sendResponse({
                res,
                statusCode: 500,
                success: false,
                message: error.message || 'Failed to update profile'
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

            const result = await userService.refreshAccessToken(refreshToken);

            sendResponse({
                res,
                statusCode: 200,
                success: result.success,
                message: result.message,
                data: result.data
            });

        } catch (error) {
            sendResponse({
                res,
                statusCode: 401,
                success: false,
                message: error.message || 'Failed to refresh token'
            });
        }
    };

// Logout user (optional - mainly for token invalidation)
exports.logout = async (req, res) => {
        try {
            // In a more sophisticated system, you might want to blacklist the token
            // For now, we'll just return success
            sendResponse({
                res,
                statusCode: 200,
                success: true,
                message: 'Logout successful'
            });

        } catch (error) {
            sendResponse({
                res,
                statusCode: 500,
                success: false,
                message: error.message || 'Failed to logout'
            });
        }
    };
