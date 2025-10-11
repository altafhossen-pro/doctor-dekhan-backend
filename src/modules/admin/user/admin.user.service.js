const User = require("../../user/user.model");

exports.getAllUsersForAdmin = async ({ page, limit, search, status, sortBy, sortOrder }) => {
    try {
        // Build query object
        const query = {};
        
        // Add search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Add status filter
        if (status && status !== 'all') {
            if (status === 'active') {
                query.isActive = true;
            } else if (status === 'inactive') {
                query.isActive = false;
            } else if (status === 'verified') {
                query.isVerified = true;
            } else if (status === 'unverified') {
                query.isVerified = false;
            }
        }
        
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Calculate pagination
        const skip = (page - 1) * limit;
        
        // Execute query with pagination
        const users = await User.find(query)
            .select('-password') // Exclude password field
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
        
        // Get total count for pagination
        const total = await User.countDocuments(query);
        
        // Calculate pagination info
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        
        return {
            users,
            pagination: {
                currentPage: page,
                totalPages,
                totalUsers: total,
                hasNextPage,
                hasPrevPage,
                limit
            }
        };
    } catch (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
    }
};

exports.getUserById = async (userId) => {
    try {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    } catch (error) {
        throw new Error(`Failed to fetch user: ${error.message}`);
    }
};

exports.updateUserStatus = async (userId, updateData) => {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            {
                isActive: updateData.isActive,
                isVerified: updateData.isVerified,
                updatedAt: new Date()
            },
            { new: true }
        ).select('-password');

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    } catch (error) {
        throw new Error(`Failed to update user status: ${error.message}`);
    }
};

exports.deleteUser = async (userId) => {
    try {
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    } catch (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
    }
};

exports.getUserStats = async () => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const inactiveUsers = await User.countDocuments({ isActive: false });
        const verifiedUsers = await User.countDocuments({ isVerified: true });
        const unverifiedUsers = await User.countDocuments({ isVerified: false });
        
        // Get recent registrations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentRegistrations = await User.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Get users by gender
        const usersByGender = await User.aggregate([
            { $group: { _id: '$gender', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Get users by city
        const usersByCity = await User.aggregate([
            { $group: { _id: '$address.city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        return {
            totalUsers,
            activeUsers,
            inactiveUsers,
            verifiedUsers,
            unverifiedUsers,
            recentRegistrations,
            usersByGender,
            usersByCity
        };
    } catch (error) {
        throw new Error(`Failed to fetch user statistics: ${error.message}`);
    }
};
