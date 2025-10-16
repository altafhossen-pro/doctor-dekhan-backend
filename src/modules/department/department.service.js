const Department = require('./department.model');
const Doctor = require('../doctor/doctor.model');

// Get all active departments
exports.getAllActiveDepartments = async () => {
    try {
        return await Department.findActive();
    } catch (error) {
        throw error;
    }
};

// Get all active departments with doctor counts
exports.getAllActiveDepartmentsWithDoctorCounts = async () => {
    try {
        const departments = await Department.findActive();
        
        // Get doctor counts for each department
        const departmentsWithCounts = await Promise.all(
            departments.map(async (department) => {
                const doctorCount = await Doctor.countDocuments({
                    departments: department._id,
                    status: 'approved',
                    isActive: true
                });
                
                return {
                    ...department.toObject({ virtuals: true }),
                    doctorCount
                };
            })
        );
        
        return departmentsWithCounts;
    } catch (error) {
        throw error;
    }
};

// Get department by slug
exports.getDepartmentBySlug = async (slug) => {
    try {
        return await Department.findBySlug(slug);
    } catch (error) {
        throw error;
    }
};

// Get department by ID
exports.getDepartmentById = async (id) => {
    try {
        return await Department.findById(id);
    } catch (error) {
        throw error;
    }
};

// Get department statistics
exports.getDepartmentStats = async () => {
    try {
        const [totalDepartments, activeDepartments, inactiveDepartments] = await Promise.all([
            Department.countDocuments(),
            Department.countDocuments({ isActive: true }),
            Department.countDocuments({ isActive: false })
        ]);

        return {
            total: totalDepartments,
            active: activeDepartments,
            inactive: inactiveDepartments
        };
    } catch (error) {
        throw error;
    }
};

// Search departments
exports.searchDepartments = async (query, limit = 10) => {
    try {
        const searchRegex = new RegExp(query, 'i');
        
        return await Department.find({
            isActive: true,
            $or: [
                { name: searchRegex },
                { description: searchRegex }
            ]
        })
        .sort({ sortOrder: 1, name: 1 })
        .limit(parseInt(limit));
    } catch (error) {
        throw error;
    }
};

// Get departments with pagination
exports.getDepartmentsWithPagination = async (options) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = 'sortOrder',
            sortOrder = 'asc',
            search = ''
        } = options;

        // Build query
        let query = { isActive: true };

        // Add search filter if provided
        if (search && search.trim() !== '') {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: searchRegex },
                { description: searchRegex }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query
        const [departments, totalCount] = await Promise.all([
            Department.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Department.countDocuments(query)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            departments,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCount,
                limit: parseInt(limit),
                hasNextPage,
                hasPrevPage
            }
        };
    } catch (error) {
        throw error;
    }
};

// Create new department (admin only)
exports.createDepartment = async (departmentData, adminId) => {
    try {
        // Check if department with same name already exists
        const existingDepartment = await Department.findOne({
            $or: [
                { name: departmentData.name },
                { slug: departmentData.slug }
            ]
        });

        if (existingDepartment) {
            throw new Error('Department with this name or slug already exists');
        }

        const department = new Department({
            ...departmentData,
            createdBy: adminId
        });

        await department.save();
        return department;
    } catch (error) {
        throw error;
    }
};

// Update department (admin only)
exports.updateDepartment = async (id, updateData, adminId) => {
    try {
        const department = await Department.findByIdAndUpdate(
            id,
            {
                ...updateData,
                updatedBy: adminId
            },
            { new: true, runValidators: true }
        );

        if (!department) {
            throw new Error('Department not found');
        }

        return department;
    } catch (error) {
        throw error;
    }
};

// Delete department (admin only)
exports.deleteDepartment = async (id) => {
    try {
        const department = await Department.findByIdAndDelete(id);
        
        if (!department) {
            throw new Error('Department not found');
        }

        return department;
    } catch (error) {
        throw error;
    }
};

// Toggle department status (admin only)
exports.toggleDepartmentStatus = async (id, adminId) => {
    try {
        const department = await Department.findById(id);
        
        if (!department) {
            throw new Error('Department not found');
        }

        department.isActive = !department.isActive;
        department.updatedBy = adminId;
        
        await department.save();
        return department;
    } catch (error) {
        throw error;
    }
};

// Get all departments for admin (with pagination and filters)
exports.getAllDepartmentsForAdmin = async (options) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = 'all',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;

        // Build query
        let query = {};

        // Status filter
        if (status !== 'all') {
            query.isActive = status === 'active';
        }

        // Search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query
        const [departments, totalCount] = await Promise.all([
            Department.find(query)
                .populate('createdBy', 'firstName lastName email')
                .populate('updatedBy', 'firstName lastName email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Department.countDocuments(query)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            departments,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCount,
                limit: parseInt(limit),
                hasNextPage,
                hasPrevPage
            }
        };
    } catch (error) {
        throw error;
    }
};
