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
            isVerificationStatusSended ,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const result = await doctorService.getAllDoctorsForAdmin({
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            status,
            isVerificationStatusSended,
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

// Toggle doctor edit profile permission
exports.toggleEditProfilePermission = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { isCurrentlyHaveEditProfile } = req.body;

        if (typeof isCurrentlyHaveEditProfile !== 'boolean') {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'isCurrentlyHaveEditProfile must be a boolean value'
            });
        }

        const updatedDoctor = await doctorService.toggleEditProfilePermission(doctorId, {
            isCurrentlyHaveEditProfile,
            updatedBy: req.admin._id
        });

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: `Doctor edit profile permission ${isCurrentlyHaveEditProfile ? 'enabled' : 'disabled'} successfully`,
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

// Update doctor information
exports.updateDoctor = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const updateData = req.body;

        // Add updatedBy field
        updateData.updatedBy = req.admin._id;

        const updatedDoctor = await doctorService.updateDoctor(doctorId, updateData);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Doctor updated successfully',
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

// Toggle pricing editing for doctor
exports.togglePricingEdit = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { canEdit } = req.body;
        const adminId = req.admin._id;

        if (typeof canEdit !== 'boolean') {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'canEdit must be a boolean value'
            });
        }

        const doctor = await doctorService.togglePricingEdit(doctorId, canEdit, adminId);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: `Pricing editing ${canEdit ? 'enabled' : 'disabled'} successfully`,
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

// Approve pending pricing updates
exports.approvePendingPricing = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const adminId = req.admin._id;

        const doctor = await doctorService.approvePendingPricing(doctorId, adminId);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Pending pricing updates approved successfully',
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

// Reject pending pricing updates
exports.rejectPendingPricing = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { reason } = req.body;
        const adminId = req.admin._id;

        const doctor = await doctorService.rejectPendingPricing(doctorId, adminId, reason);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Pending pricing updates rejected successfully',
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

// Get doctors with pending pricing updates
exports.getDoctorsWithPendingPricing = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const result = await doctorService.getDoctorsWithPendingPricing({
            page: parseInt(page),
            limit: parseInt(limit)
        });

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Doctors with pending pricing retrieved successfully',
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