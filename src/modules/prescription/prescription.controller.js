const prescriptionService = require('./prescription.service');
const sendResponse = require('../../utils/sendResponse');

// Create new prescription
exports.createPrescription = async (req, res) => {
    try {
        const { appointment, diagnosis, symptoms, medications, tests, followUp, generalAdvice, dietAdvice, lifestyleAdvice, restrictions } = req.body;
        const doctorId = req.doctor._id;
        
        // Get user ID from appointment
        const Appointment = require('../appointment/appointment.model');
        const appointmentDoc = await Appointment.findById(appointment).populate('user');
        
        if (!appointmentDoc) {
            return sendResponse({
                res,
                statusCode: 404,
                success: false,
                message: 'Appointment not found'
            });
        }
        
        // Validate required fields
        if (!appointment || !diagnosis) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'appointment and diagnosis are required'
            });
        }
        
        const prescription = await prescriptionService.createPrescription({
            appointment,
            doctor: doctorId,
            user: appointmentDoc.user._id,
            diagnosis,
            symptoms,
            medications,
            tests,
            followUp,
            generalAdvice,
            dietAdvice,
            lifestyleAdvice,
            restrictions
        });
        
        sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Prescription created successfully',
            data: { prescription }
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

// Get prescriptions for a doctor
exports.getDoctorPrescriptions = async (req, res) => {
    try {
        const doctorId = req.doctor._id;
        const { page = 1, limit = 10, date, isActive } = req.query;
        
        const result = await prescriptionService.getDoctorPrescriptions(doctorId, {
            page: parseInt(page),
            limit: parseInt(limit),
            date,
            isActive: isActive === 'true'
        });
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Doctor prescriptions retrieved successfully',
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

// Get prescriptions for a user
exports.getUserPrescriptions = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10, isActive } = req.query;
        
        const result = await prescriptionService.getUserPrescriptions(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            isActive: isActive === 'true'
        });
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'User prescriptions retrieved successfully',
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

// Get single prescription by ID
exports.getPrescriptionById = async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const prescription = await prescriptionService.getPrescriptionById(prescriptionId);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Prescription retrieved successfully',
            data: { prescription }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 404,
            success: false,
            message: error.message
        });
    }
};

// Update prescription
exports.updatePrescription = async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const updateData = req.body;
        const updatedBy = req.doctor._id;
        
        const prescription = await prescriptionService.updatePrescription(
            prescriptionId,
            updateData,
            updatedBy
        );
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Prescription updated successfully',
            data: { prescription }
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

// Deactivate prescription
exports.deactivatePrescription = async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const deactivatedBy = req.doctor._id;
        
        const prescription = await prescriptionService.deactivatePrescription(
            prescriptionId,
            deactivatedBy
        );
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Prescription deactivated successfully',
            data: { prescription }
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

// Get prescription statistics
exports.getPrescriptionStats = async (req, res) => {
    try {
        const doctorId = req.doctor._id;
        const { period = 'month' } = req.query;
        
        const stats = await prescriptionService.getPrescriptionStats(doctorId, period);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Prescription statistics retrieved successfully',
            data: { stats }
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

// Get prescriptions by date range
exports.getPrescriptionsByDateRange = async (req, res) => {
    try {
        const doctorId = req.doctor._id;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'startDate and endDate are required'
            });
        }
        
        const prescriptions = await prescriptionService.getPrescriptionsByDateRange(
            doctorId,
            new Date(startDate),
            new Date(endDate)
        );
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Prescriptions retrieved successfully',
            data: { prescriptions }
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

// Search prescriptions
exports.searchPrescriptions = async (req, res) => {
    try {
        const doctorId = req.doctor._id;
        const { searchTerm, page = 1, limit = 10 } = req.query;
        
        if (!searchTerm) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'searchTerm is required'
            });
        }
        
        const result = await prescriptionService.searchPrescriptions(doctorId, searchTerm, {
            page: parseInt(page),
            limit: parseInt(limit)
        });
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Prescription search completed successfully',
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

// Get expired prescriptions (admin only)
exports.getExpiredPrescriptions = async (req, res) => {
    try {
        const expiredPrescriptions = await prescriptionService.getExpiredPrescriptions();
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Expired prescriptions retrieved successfully',
            data: { expiredPrescriptions }
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
