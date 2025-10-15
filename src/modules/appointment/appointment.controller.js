const appointmentService = require('./appointment.service');
const sendResponse = require('../../utils/sendResponse');

// Create new appointment
exports.createAppointment = async (req, res) => {
    try {
        const { doctor, department, appointmentDate, startTime, endTime, reason, consultationFee } = req.body;
        const userId = req.user._id;
        
        // Validate required fields
        if (!doctor || !department || !appointmentDate || !startTime || !endTime || !reason) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'doctor, department, appointmentDate, startTime, endTime, and reason are required'
            });
        }
        
        const appointment = await appointmentService.createAppointment({
            doctor,
            user: userId,
            department,
            appointmentDate,
            startTime,
            endTime,
            reason,
            consultationFee
        });
        
        sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Appointment created successfully',
            data: { appointment }
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

// Get appointments for a doctor
exports.getDoctorAppointments = async (req, res) => {
    try {
        const doctorId = req.doctor._id;
        const { status, date, page = 1, limit = 10 } = req.query;
        
        const result = await appointmentService.getDoctorAppointments(doctorId, {
            status,
            date,
            page: parseInt(page),
            limit: parseInt(limit)
        });
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Doctor appointments retrieved successfully',
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

// Get appointments for a user
exports.getUserAppointments = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status, page = 1, limit = 10 } = req.query;
        
        const result = await appointmentService.getUserAppointments(userId, {
            status,
            page: parseInt(page),
            limit: parseInt(limit)
        });
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'User appointments retrieved successfully',
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

// Get single appointment by ID
exports.getAppointmentById = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const appointment = await appointmentService.getAppointmentById(appointmentId);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Appointment retrieved successfully',
            data: { appointment }
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

// Update appointment status
exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { status, notes } = req.body;
        const updatedBy = req.doctor ? req.doctor._id : req.user._id;
        
        if (!status) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Status is required'
            });
        }
        
        const appointment = await appointmentService.updateAppointmentStatus(
            appointmentId,
            status,
            updatedBy,
            notes
        );
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Appointment status updated successfully',
            data: { appointment }
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

// Cancel appointment
exports.cancelAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { cancellationReason } = req.body;
        const cancelledBy = req.doctor ? req.doctor._id : req.user._id;
        
        const appointment = await appointmentService.cancelAppointment(
            appointmentId,
            cancelledBy,
            cancellationReason
        );
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Appointment cancelled successfully',
            data: { appointment }
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

// Reschedule appointment
exports.rescheduleAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { newDate, newStartTime, newEndTime } = req.body;
        const rescheduledBy = req.doctor ? req.doctor._id : req.user._id;
        
        if (!newDate || !newStartTime || !newEndTime) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'newDate, newStartTime, and newEndTime are required'
            });
        }
        
        const appointment = await appointmentService.rescheduleAppointment(
            appointmentId,
            newDate,
            newStartTime,
            newEndTime,
            rescheduledBy
        );
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Appointment rescheduled successfully',
            data: { appointment }
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

// Get available time slots
exports.getAvailableSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date } = req.query;
        
        if (!date) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Date is required'
            });
        }
        
        const availableSlots = await appointmentService.getAvailableSlots(doctorId, date);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Available slots retrieved successfully',
            data: { availableSlots }
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

// Get appointment statistics
exports.getAppointmentStats = async (req, res) => {
    try {
        const doctorId = req.doctor._id;
        const { period = 'month' } = req.query;
        
        const stats = await appointmentService.getAppointmentStats(doctorId, period);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Appointment statistics retrieved successfully',
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
