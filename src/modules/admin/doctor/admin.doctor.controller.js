const doctorService = require('./admin.doctor.service');
const sendResponse = require('../../../utils/sendResponse');

// Get all doctors with pagination and filters
exports.getAllDoctors = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = 'all',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const result = await doctorService.getAllDoctorsForAdmin({
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
            message: 'Doctors retrieved successfully',
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

// Get single doctor by ID
exports.getDoctorById = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const doctor = await doctorService.getDoctorById(doctorId);

        if (!doctor) {
            return sendResponse({
                res,
                statusCode: 404,
                success: false,
                message: 'Doctor not found'
            });
        }

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Doctor retrieved successfully',
            data: { doctor }
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

// Update doctor status (approve/reject)
exports.updateDoctorStatus = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { status, rejectionReason } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Invalid status. Must be approved or rejected'
            });
        }

        const updatedDoctor = await doctorService.updateDoctorStatus(doctorId, {
            status,
            rejectionReason: status === 'rejected' ? rejectionReason : null,
            updatedBy: req.admin._id
        });

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: `Doctor ${status} successfully`,
            data: { doctor: updatedDoctor }
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

// Delete doctor
exports.deleteDoctor = async (req, res) => {
    try {
        const { doctorId } = req.params;
        
        const deletedDoctor = await doctorService.deleteDoctor(doctorId);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Doctor deleted successfully',
            data: { doctor: deletedDoctor }
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

// Get doctor statistics
exports.getDoctorStats = async (req, res) => {
    try {
        const stats = await doctorService.getDoctorStats();

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Doctor statistics retrieved successfully',
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