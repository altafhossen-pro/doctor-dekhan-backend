const User = require('./user.model');
const OTP = require('../otp/otp.model');
const Doctor = require('../doctor/doctor.model');
const { cleanupOTPs } = require('../../utils/cleanup');
const jwt = require('jsonwebtoken');

// Generate Access Token (30 minutes)
exports.generateAccessToken = (userId) => {
    return jwt.sign(
        { userId, type: 'access' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30m' }
    );
};

// Generate Refresh Token (7 days)
exports.generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '30d' }
    );
};

// Generate both tokens
exports.generateTokens = (userId) => {
    return {
        accessToken: exports.generateAccessToken(userId),
        refreshToken: exports.generateRefreshToken(userId)
    };
};

// Verify Access Token
exports.verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (decoded.type !== 'access') {
            throw new Error('Invalid token type');
        }
        return decoded;
    } catch (error) {
        throw new Error('Invalid access token');
    }
};

// Verify Refresh Token
exports.verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        return decoded;
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
};

// Generate 6-digit OTP (Development: Simple 1-6 digits)
exports.generateOTP = () => {
    
    // Production mode: Generate random 6-digit OTP
    // return Math.floor(100000 + Math.random() * 900000).toString();
    return '123456';
};

// Send OTP to phone number (with cross-role validation)
exports.sendOTP = async (phone) => {
    try {
        // Check if phone number is already used by a doctor
        const existingDoctor = await Doctor.findOne({ phone });
        if (existingDoctor) {
            throw new Error('This phone number is already registered. Please try again with another number.');
        }

        // Clean up expired OTPs globally (lightweight cleanup)
        await cleanupOTPs();

        // Check if there's already a valid (unused, not expired) OTP for this phone
        const existingOTP = await OTP.findOne({
            phone,
            type: 'phone_verification',
            isUsed: false,
            expiresAt: { $gt: new Date() }
        });

        if (existingOTP) {
            // Update existing OTP with new code and expiry
            const otpCode = exports.generateOTP();
            existingOTP.otp = otpCode;
            existingOTP.expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
            existingOTP.attempts = 0; // Reset attempts
            existingOTP.isBlocked = false; // Reset block status
            existingOTP.blockedUntil = null; // Clear block time
            await existingOTP.save();

            // TODO: Send OTP via SMS service
            console.log(`🔐 DEVELOPMENT OTP for ${phone}: ${otpCode} (Updated existing)`);

            return {
                success: true,
                message: 'OTP sent successfully',
                data: {
                    phone,
                    expiresIn: '2 minutes'
                }
            };
        } else {
            // No valid OTP exists, create new one
            // First, clean up all expired/used OTPs for this phone number
            await OTP.deleteMany({ 
                phone, 
                type: 'phone_verification',
                $or: [
                    { expiresAt: { $lt: new Date() } }, // Expired OTPs
                    { isUsed: true } // Used OTPs
                ]
            });

            // Generate 6-digit OTP
            const otpCode = exports.generateOTP();

            // Create new OTP record
            const otpData = new OTP({
                phone,
                otp: otpCode,
                type: 'phone_verification'
            });
            await otpData.save();

            // TODO: Send OTP via SMS service
            console.log(`🔐 DEVELOPMENT OTP for ${phone}: ${otpCode} (New)`);

            return {
                success: true,
                message: 'OTP sent successfully',
                data: {
                    phone,
                    expiresIn: '2 minutes'
                }
            };
        }
    } catch (error) {
        throw new Error(error.message || 'Failed to send OTP');
    }
};

// Send OTP to phone number (without cross-role validation - for internal use)
exports.sendOTPInternal = async (phone) => {
    try {
        // Clean up expired OTPs globally (lightweight cleanup)
        await cleanupOTPs();

        // Check if there's already a valid (unused, not expired) OTP for this phone
        const existingOTP = await OTP.findOne({
            phone,
            type: 'phone_verification',
            isUsed: false,
            expiresAt: { $gt: new Date() }
        });

        if (existingOTP) {
            // Update existing OTP with new code and expiry
            const otpCode = exports.generateOTP();
            existingOTP.otp = otpCode;
            existingOTP.expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
            existingOTP.attempts = 0; // Reset attempts
            existingOTP.isBlocked = false; // Reset block status
            existingOTP.blockedUntil = null; // Clear block time
            await existingOTP.save();

            // TODO: Send OTP via SMS service
            console.log(`🔐 DEVELOPMENT OTP for ${phone}: ${otpCode} (Updated existing)`);

            return {
                success: true,
                message: 'OTP sent successfully',
                data: {
                    phone,
                    expiresIn: '2 minutes'
                }
            };
        } else {
            // No valid OTP exists, create new one
            // First, clean up all expired/used OTPs for this phone number
            await OTP.deleteMany({ 
                phone, 
                type: 'phone_verification',
                $or: [
                    { isUsed: true },
                    { expiresAt: { $lt: new Date() } }
                ]
            });

            const otpCode = exports.generateOTP();
            const otpRecord = new OTP({
                phone,
                otp: otpCode,
                type: 'phone_verification',
                expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now
            });

            await otpRecord.save();

            // TODO: Send OTP via SMS service
            console.log(`🔐 DEVELOPMENT OTP for ${phone}: ${otpCode} (New)`);

            return {
                success: true,
                message: 'OTP sent successfully',
                data: {
                    phone,
                    expiresIn: '2 minutes'
                }
            };
        }
    } catch (error) {
        throw new Error(error.message || 'Failed to send OTP');
    }
};

// Verify OTP and check user existence
exports.verifyOTP = async (phone, otp) => {
    try {
        // Clean up expired OTPs globally (lightweight cleanup)
        await cleanupOTPs();

        // Find valid OTP
        const otpRecord = await OTP.findValidOTP(phone, otp, 'phone_verification');
        
        if (!otpRecord) {
            throw new Error('Invalid or expired OTP');
        }

        // Mark OTP as used
        await otpRecord.markAsUsed();

        // Clean up all used OTPs for this phone number (older than 1 hour)
        await OTP.deleteMany({
            phone,
            type: 'phone_verification',
            isUsed: true,
            createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour ago
        });

        // Check if user exists
        const userExists = await exports.checkUserExists(phone);

        if (userExists) {
            // User exists - login directly
            const user = await exports.findUserByPhone(phone);
            const loginResult = await exports.loginUser(user);

            return {
                success: true,
                message: 'Login successful',
                data: {
                    ...loginResult.data,
                    isNewUser: false
                }
            };
        } else {
            // User doesn't exist - need to collect name
            return {
                success: true,
                message: 'OTP verified. Please provide your name to complete registration.',
                data: {
                    isNewUser: true,
                    phone,
                    requiresName: true
                }
            };
        }
    } catch (error) {
        throw new Error(error.message || 'Failed to verify OTP');
    }
};

// Complete user registration
exports.completeRegistration = async (phone, name) => {
    try {
        // Clean up expired OTPs globally (lightweight cleanup)
        await cleanupOTPs();

        // Check if user already exists
        const userExists = await exports.checkUserExists(phone);
        if (userExists) {
            throw new Error('User already exists with this phone number');
        }

        // Create new user
        const userData = {
            phone,
            name: name.trim()
        };

        await exports.createUserWithPhone(userData);
        const user = await exports.findUserByPhone(phone);
        const loginResult = await exports.loginUser(user);

        return {
            success: true,
            message: 'Registration completed successfully',
            data: {
                ...loginResult.data,
                isNewUser: true
            }
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to complete registration');
    }
};

// Create user with phone and name (for OTP-based registration)
exports.createUserWithPhone = async (userData) => {
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ phone: userData.phone });
        if (existingUser) {
            throw new Error('User already exists with this phone number');
        }

        // Phone validation is already done at OTP sending stage

        // Create user with minimal required fields
        const user = new User({
            phone: userData.phone,
            name: userData.name,
            isVerified: true,
            isActive: true,
            role: 'user'
        });
        
        await user.save();

        return {
            success: true,
            message: 'User created successfully',
            data: user.getPublicProfile()
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to create user');
    }
};

// Check if user exists
exports.checkUserExists = async (phone) => {
    try {
        const user = await User.findOne({ phone });
        return !!user;
    } catch (error) {
        throw new Error(error.message || 'Failed to check user existence');
    }
};

// Find user by phone
exports.findUserByPhone = async (phone) => {
    try {
        const user = await User.findOne({ phone, isActive: true });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    } catch (error) {
        throw new Error(error.message || 'Failed to find user');
    }
};

// Login user (after OTP verification)
exports.loginUser = async (user) => {
    try {
        const tokens = exports.generateTokens(user._id);
        
        return {
            success: true,
            message: 'Login successful',
            data: {
                user: user.getPublicProfile(),
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            }
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to login user');
    }
};

// Refresh access token
exports.refreshAccessToken = async (refreshToken) => {
    try {
        // Verify refresh token
        const decoded = exports.verifyRefreshToken(refreshToken);
        
        // Find user
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            throw new Error('User not found or inactive');
        }

        // Generate new access token
        const newAccessToken = exports.generateAccessToken(user._id);
        
        return {
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken: newAccessToken
            }
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to refresh token');
    }
};

// Get user profile
exports.getUserProfile = async (userId) => {
    try {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            throw new Error('User not found');
        }

        return {
            success: true,
            message: 'Profile retrieved successfully',
            data: user
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to get user profile');
    }
};

// Update user profile
exports.updateUserProfile = async (userId, updateData) => {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!user) {
            throw new Error('User not found');
        }

        return {
            success: true,
            message: 'Profile updated successfully',
            data: user.getPublicProfile()
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to update profile');
    }
};

// Create new user (general method)
exports.createUser = async (userData) => {
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ phone: userData.phone });
        if (existingUser) {
            throw new Error('User already exists with this phone number');
        }

        // Phone validation is already done at OTP sending stage

        // Create user
        const user = new User(userData);
        await user.save();

        return {
            success: true,
            message: 'User created successfully',
            data: user.getPublicProfile()
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to create user');
    }
};

// Find user by email or phone
exports.findUserByEmailOrPhone = async (identifier) => {
    try {
        const user = await User.findByEmailOrPhone(identifier);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    } catch (error) {
        throw new Error(error.message || 'Failed to find user');
    }
};

// Verify user account
exports.verifyUser = async (userId) => {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { isVerified: true },
            { new: true }
        );

        if (!user) {
            throw new Error('User not found');
        }

        return {
            success: true,
            message: 'Account verified successfully',
            data: user.getPublicProfile()
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to verify user');
    }
};

// Deactivate user account
exports.deactivateUser = async (userId) => {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { isActive: false },
            { new: true }
        );

        if (!user) {
            throw new Error('User not found');
        }

        return {
            success: true,
            message: 'Account deactivated successfully'
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to deactivate account');
    }
};

// Get all users (admin only)
exports.getAllUsers = async (page = 1, limit = 10, role = null) => {
    try {
        const query = role ? { role } : {};
        const skip = (page - 1) * limit;

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(query);

        return {
            success: true,
            message: 'Users retrieved successfully',
            data: {
                users,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalUsers: total,
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            }
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to get users');
    }
};