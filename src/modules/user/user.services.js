const User = require('./user.model');
const jwt = require('jsonwebtoken');
const { sendResponse } = require('../../utils/sendResponse');

class UserService {
    // Generate JWT token
    generateToken(userId) {
        return jwt.sign(
            { userId },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
    }

    // Create new user
    async createUser(userData) {
        try {
            // Check if user already exists
            const existingUser = await User.findOne({ phone: userData.phone });
            if (existingUser) {
                throw new Error('User already exists with this phone number');
            }

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
    }

    // Find user by phone
    async findUserByPhone(phone) {
        try {
            const user = await User.findOne({ phone, isActive: true });
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            throw new Error(error.message || 'Failed to find user');
        }
    }

    // Find user by email or phone
    async findUserByEmailOrPhone(identifier) {
        try {
            const user = await User.findByEmailOrPhone(identifier);
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            throw new Error(error.message || 'Failed to find user');
        }
    }

    // Update user profile
    async updateUserProfile(userId, updateData) {
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
    }

    // Verify user account
    async verifyUser(userId) {
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
    }

    // Login user (after OTP verification)
    async loginUser(user) {
        try {
            const token = this.generateToken(user._id);
            
            return {
                success: true,
                message: 'Login successful',
                data: {
                    user: user.getPublicProfile(),
                    token
                }
            };
        } catch (error) {
            throw new Error(error.message || 'Failed to login user');
        }
    }

    // Get user profile
    async getUserProfile(userId) {
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
    }

    // Check if user exists
    async checkUserExists(phone) {
        try {
            const user = await User.findOne({ phone });
            return !!user;
        } catch (error) {
            throw new Error(error.message || 'Failed to check user existence');
        }
    }

    // Deactivate user account
    async deactivateUser(userId) {
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
    }

    // Get all users (admin only)
    async getAllUsers(page = 1, limit = 10, role = null) {
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
    }
}

module.exports = new UserService();
