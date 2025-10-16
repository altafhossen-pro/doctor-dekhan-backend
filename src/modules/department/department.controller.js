const departmentService = require('./department.service');
const sendResponse = require('../../utils/sendResponse');

// Get all active departments (public)
exports.getAllDepartments = async (req, res) => {
    try {
        const { includeDoctorCount = false } = req.query;
        
        let departments;
        if (includeDoctorCount === 'true') {
            departments = await departmentService.getAllActiveDepartmentsWithDoctorCounts();
        } else {
            departments = await departmentService.getAllActiveDepartments();
        }
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Departments retrieved successfully',
            data: {
                departments: departments.map(dept => {
                    // If dept has publicInfo (from regular getAllActiveDepartments)
                    if (dept.publicInfo) {
                        return {
                            ...dept.publicInfo,
                            ...(dept.doctorCount !== undefined && { doctorCount: dept.doctorCount })
                        };
                    }
                    // If dept is from getAllActiveDepartmentsWithDoctorCounts (already has virtuals)
                    else {
                        return {
                            id: dept.id,
                            name: dept.name,
                            slug: dept.slug,
                            description: dept.description,
                            icon: dept.icon,
                            image: dept.image,
                            color: dept.color,
                            isActive: dept.isActive,
                            ...(dept.doctorCount !== undefined && { doctorCount: dept.doctorCount })
                        };
                    }
                }),
                count: departments.length
            }
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

// Get department by slug (public)
exports.getDepartmentBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const department = await departmentService.getDepartmentBySlug(slug);
        
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
            data: {
                department: department.publicInfo
            }
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

// Get department by ID (public)
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
            data: {
                department: department.publicInfo
            }
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

// Get department statistics (public)
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

// Search departments (public)
exports.searchDepartments = async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;
        
        if (!query || query.trim() === '') {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Search query is required'
            });
        }
        
        const departments = await departmentService.searchDepartments(query, parseInt(limit));
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Search results retrieved successfully',
            data: {
                departments: departments.map(dept => dept.publicInfo),
                count: departments.length,
                query: query.trim()
            }
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

// Get departments with pagination (public)
exports.getDepartmentsWithPagination = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            sortBy = 'sortOrder', 
            sortOrder = 'asc',
            search = ''
        } = req.query;
        
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder,
            search: search.trim()
        };
        
        const result = await departmentService.getDepartmentsWithPagination(options);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Departments retrieved successfully',
            data: {
                departments: result.departments.map(dept => dept.publicInfo),
                pagination: result.pagination
            }
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
