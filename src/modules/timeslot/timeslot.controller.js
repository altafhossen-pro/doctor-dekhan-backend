const timeSlotService = require('./timeslot.service');
const sendResponse = require('../../utils/sendResponse');

// Public endpoint for getting available slots (for appointment booking)
exports.getPublicAvailableSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date, dayOfWeek } = req.query;
        
        if (!doctorId || !date || !dayOfWeek) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Doctor ID, date, and dayOfWeek are required'
            });
        }
        
        const availableSlots = await timeSlotService.getAvailableSlots(doctorId, date, dayOfWeek);
        
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

// Public endpoint for getting available slots for a date range
exports.getPublicAvailableSlotsRange = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!doctorId || !startDate || !endDate) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Doctor ID, startDate, and endDate are required'
            });
        }
        
        const availableSlots = await timeSlotService.getAvailableSlotsRange(doctorId, startDate, endDate);
        
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

// Create or update time slot
exports.createOrUpdateTimeSlot = async (req, res) => {
    try {
        const doctorId = req.doctor._id;
        const { dayOfWeek, startTime, endTime, slotDuration, maxAppointments } = req.body;
        
        // Validate required fields
        if (!dayOfWeek || !startTime || !endTime || !slotDuration) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'dayOfWeek, startTime, endTime, and slotDuration are required'
            });
        }
        
        // Validate slot duration
        if (slotDuration < 10 || slotDuration > 120) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Slot duration must be between 10 and 120 minutes'
            });
        }
        
        const timeSlot = await timeSlotService.createOrUpdateTimeSlot(doctorId, {
            dayOfWeek,
            startTime,
            endTime,
            slotDuration,
            maxAppointments
        });
        
        sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Time slot created/updated successfully',
            data: { timeSlot }
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

// Get all time slots for a doctor
exports.getDoctorTimeSlots = async (req, res) => {
    try {
        const doctorId = req.doctor._id;
        const timeSlots = await timeSlotService.getDoctorTimeSlots(doctorId);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Time slots retrieved successfully',
            data: { timeSlots }
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

// Get time slots for a specific day
exports.getTimeSlotsByDay = async (req, res) => {
    try {
        const doctorId = req.doctor._id;
        const { dayOfWeek } = req.params;
        
        const timeSlot = await timeSlotService.getTimeSlotsByDay(doctorId, dayOfWeek);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Time slot retrieved successfully',
            data: { timeSlot }
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

// Get available slots for a specific date
exports.getAvailableSlots = async (req, res) => {
    try {
        const doctorId = req.doctor._id;
        const { date, dayOfWeek } = req.query;
        
        if (!date || !dayOfWeek) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Date and dayOfWeek are required'
            });
        }
        
        const availableSlots = await timeSlotService.getAvailableSlots(doctorId, date, dayOfWeek);
        
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

// Delete time slot
exports.deleteTimeSlot = async (req, res) => {
    try {
        const { timeSlotId } = req.params;
        const timeSlot = await timeSlotService.deleteTimeSlot(timeSlotId);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Time slot deleted successfully',
            data: { timeSlot }
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

// Toggle time slot status
exports.toggleTimeSlotStatus = async (req, res) => {
    try {
        const { timeSlotId } = req.params;
        const { isActive } = req.body;
        
        const timeSlot = await timeSlotService.toggleTimeSlotStatus(timeSlotId, isActive);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: `Time slot ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: { timeSlot }
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

// Get time slot statistics
exports.getTimeSlotStats = async (req, res) => {
    try {
        const doctorId = req.doctor._id;
        const stats = await timeSlotService.getTimeSlotStats(doctorId);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Time slot statistics retrieved successfully',
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
