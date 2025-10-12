const departmentService = require('../../department/department.service');
const sendResponse = require('../../../utils/sendResponse');

// Get all departments for admin (with pagination and filters)
exports.getAllDepartments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = 'all',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            search: search.trim(),
            status,
            sortBy,
            sortOrder
        };

        const result = await departmentService.getAllDepartmentsForAdmin(options);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Departments retrieved successfully',
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

// Get department by ID (admin)
exports.getDepartmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const department = await departmentService.getDepartmentById(id);

        if (!department) {
            return sendResponse({
                res,
                statusCode: 404,
                success: false,
                message: 'Department not found'
            });
        }

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Department retrieved successfully',
            data: { department }
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

// Create new department (admin)
exports.createDepartment = async (req, res) => {
    try {
        const departmentData = req.body;
        const adminId = req.admin._id;

        // Validate required fields
        const requiredFields = ['name'];
        const missingFields = requiredFields.filter(field => !departmentData[field]);

        if (missingFields.length > 0) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        const department = await departmentService.createDepartment(departmentData, adminId);

        sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Department created successfully',
            data: { department }
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

// Update department (admin)
exports.updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const adminId = req.admin._id;

        const department = await departmentService.updateDepartment(id, updateData, adminId);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Department updated successfully',
            data: { department }
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

// Delete department (admin)
exports.deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const department = await departmentService.deleteDepartment(id);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Department deleted successfully',
            data: { department }
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

// Toggle department status (admin)
exports.toggleDepartmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin._id;

        const department = await departmentService.toggleDepartmentStatus(id, adminId);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: `Department ${department.isActive ? 'activated' : 'deactivated'} successfully`,
            data: { department }
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

// Get department statistics (admin)
exports.getDepartmentStats = async (req, res) => {
    try {
        const stats = await departmentService.getDepartmentStats();

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Department statistics retrieved successfully',
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
