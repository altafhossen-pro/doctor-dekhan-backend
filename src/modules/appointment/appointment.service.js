const Appointment = require('./appointment.model');
const TimeSlot = require('../timeslot/timeslot.model');
const Doctor = require('../doctor/doctor.model');

// Create new appointment
exports.createAppointment = async (appointmentData) => {
    try {
        const { doctor, user, department, appointmentDate, startTime, endTime, reason, consultationFee } = appointmentData;
        
        // Validate required fields
        if (!doctor || !user || !department || !appointmentDate || !startTime || !endTime || !reason) {
            throw new Error('doctor, user, department, appointmentDate, startTime, endTime, and reason are required');
        }
        
        // Get doctor with approved department pricing
        const doctorData = await Doctor.findById(doctor).populate('approvedDepartmentPricing.department');
        if (!doctorData) {
            throw new Error('Doctor not found');
        }
        
        // Check if doctor is approved
        if (doctorData.status !== 'approved') {
            throw new Error('Doctor is not approved for appointments');
        }
        
        // Find approved department pricing for the specified department
        const approvedPricing = doctorData.approvedDepartmentPricing.find(pricing => 
            pricing.department._id.toString() === department.toString()
        );
        
        if (!approvedPricing) {
            throw new Error('Doctor does not have approved pricing for this department');
        }
        
        // Use department-specific fee or provided consultation fee
        const finalConsultationFee = consultationFee || approvedPricing.fee;
        
        // Check if time slot is available
        const isAvailable = await this.checkSlotAvailability(doctor, appointmentDate, startTime);
        if (!isAvailable) {
            throw new Error('Time slot is not available');
        }
        
        // Validate appointment date is not in the past
        const appointmentDateTime = new Date(appointmentDate);
        const [hours, minutes] = startTime.split(':');
        appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (appointmentDateTime < new Date()) {
            throw new Error('Cannot create appointment in the past');
        }
        
        const appointment = new Appointment({
            doctor,
            user,
            department,
            appointmentDate,
            startTime,
            endTime,
            reason,
            consultationFee: finalConsultationFee,
            status: 'scheduled'
        });
        
        return await appointment.save();
    } catch (error) {
        throw new Error(`Failed to create appointment: ${error.message}`);
    }
};

// Get appointments for a doctor
exports.getDoctorAppointments = async (doctorId, filters = {}) => {
    try {
        const { status, date, page = 1, limit = 10 } = filters;
        
        const query = { doctor: doctorId };
        
        if (status) {
            query.status = status;
        }
        
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            
            query.appointmentDate = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }
        
        const appointments = await Appointment.find(query)
            .populate('user', 'firstName lastName email phone')
            .sort({ appointmentDate: 1, startTime: 1 })
            .skip((page - 1) * limit)
            .limit(limit);
        
        const total = await Appointment.countDocuments(query);
        
        return {
            appointments,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalCount: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        };
    } catch (error) {
        throw new Error(`Failed to fetch doctor appointments: ${error.message}`);
    }
};

// Get appointments for a user
exports.getUserAppointments = async (userId, filters = {}) => {
    try {
        const { status, page = 1, limit = 10 } = filters;
        
        const query = { user: userId };
        
        if (status) {
            query.status = status;
        }
        
        const appointments = await Appointment.find(query)
            .populate('doctor', 'firstName lastName specialization consultationFee')
            .sort({ appointmentDate: -1, startTime: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        
        const total = await Appointment.countDocuments(query);
        
        return {
            appointments,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalCount: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        };
    } catch (error) {
        throw new Error(`Failed to fetch user appointments: ${error.message}`);
    }
};

// Get single appointment by ID
exports.getAppointmentById = async (appointmentId) => {
    try {
        const appointment = await Appointment.findById(appointmentId)
            .populate('doctor', 'firstName lastName specialization consultationFee')
            .populate('user', 'firstName lastName email phone');
        
        if (!appointment) {
            throw new Error('Appointment not found');
        }
        
        return appointment;
    } catch (error) {
        throw new Error(`Failed to fetch appointment: ${error.message}`);
    }
};

// Update appointment status
exports.updateAppointmentStatus = async (appointmentId, status, updatedBy, notes = '') => {
    try {
        const appointment = await Appointment.findById(appointmentId);
        
        if (!appointment) {
            throw new Error('Appointment not found');
        }
        
        // Validate status transition
        const validTransitions = {
            'scheduled': ['confirmed', 'cancelled'],
            'confirmed': ['in-progress', 'cancelled', 'no-show'],
            'in-progress': ['completed', 'cancelled'],
            'completed': [],
            'cancelled': [],
            'no-show': []
        };
        
        if (!validTransitions[appointment.status].includes(status)) {
            throw new Error(`Invalid status transition from ${appointment.status} to ${status}`);
        }
        
        appointment.status = status;
        appointment.notes = notes;
        
        if (status === 'cancelled') {
            appointment.cancelledAt = new Date();
            appointment.cancelledBy = updatedBy;
        }
        
        return await appointment.save();
    } catch (error) {
        throw new Error(`Failed to update appointment status: ${error.message}`);
    }
};

// Cancel appointment
exports.cancelAppointment = async (appointmentId, cancelledBy, cancellationReason) => {
    try {
        const appointment = await Appointment.findById(appointmentId);
        
        if (!appointment) {
            throw new Error('Appointment not found');
        }
        
        if (appointment.status === 'cancelled') {
            throw new Error('Appointment is already cancelled');
        }
        
        if (appointment.status === 'completed') {
            throw new Error('Cannot cancel completed appointment');
        }
        
        appointment.status = 'cancelled';
        appointment.cancelledBy = cancelledBy;
        appointment.cancellationReason = cancellationReason;
        appointment.cancelledAt = new Date();
        
        return await appointment.save();
    } catch (error) {
        throw new Error(`Failed to cancel appointment: ${error.message}`);
    }
};

// Reschedule appointment
exports.rescheduleAppointment = async (appointmentId, newDate, newStartTime, newEndTime, rescheduledBy) => {
    try {
        const appointment = await Appointment.findById(appointmentId);
        
        if (!appointment) {
            throw new Error('Appointment not found');
        }
        
        if (appointment.status === 'cancelled') {
            throw new Error('Cannot reschedule cancelled appointment');
        }
        
        if (appointment.status === 'completed') {
            throw new Error('Cannot reschedule completed appointment');
        }
        
        // Check if new time slot is available
        const isAvailable = await this.checkSlotAvailability(appointment.doctor, newDate, newStartTime, appointmentId);
        if (!isAvailable) {
            throw new Error('New time slot is not available');
        }
        
        // Create new appointment record
        const rescheduledAppointment = new Appointment({
            doctor: appointment.doctor,
            user: appointment.user,
            appointmentDate: newDate,
            startTime: newStartTime,
            endTime: newEndTime,
            reason: appointment.reason,
            consultationFee: appointment.consultationFee,
            status: 'scheduled',
            isRescheduled: true,
            rescheduledFrom: appointmentId,
            createdBy: rescheduledBy
        });
        
        // Mark original appointment as rescheduled
        appointment.isRescheduled = true;
        appointment.originalAppointment = rescheduledAppointment._id;
        appointment.status = 'cancelled';
        appointment.cancelledBy = rescheduledBy;
        appointment.cancellationReason = 'Rescheduled';
        appointment.cancelledAt = new Date();
        
        await appointment.save();
        return await rescheduledAppointment.save();
    } catch (error) {
        throw new Error(`Failed to reschedule appointment: ${error.message}`);
    }
};

// Check slot availability
exports.checkSlotAvailability = async (doctorId, date, startTime, excludeAppointmentId = null) => {
    try {
        const query = {
            doctor: doctorId,
            appointmentDate: new Date(date),
            startTime: startTime,
            status: { $nin: ['cancelled', 'no-show'] }
        };
        
        if (excludeAppointmentId) {
            query._id = { $ne: excludeAppointmentId };
        }
        
        const existingAppointment = await Appointment.findOne(query);
        return !existingAppointment;
    } catch (error) {
        throw new Error(`Failed to check slot availability: ${error.message}`);
    }
};

// Get available time slots for a specific date
exports.getAvailableSlots = async (doctorId, date) => {
    try {
        // Get doctor's time slots for the day of week
        const appointmentDate = new Date(date);
        const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        const timeSlot = await TimeSlot.findOne({
            doctor: doctorId,
            dayOfWeek: dayOfWeek,
            isActive: true
        });
        
        if (!timeSlot) {
            return [];
        }
        
        // Generate all possible slots
        const allSlots = timeSlot.generateSlots();
        
        // Get existing appointments for the date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const existingAppointments = await Appointment.find({
            doctor: doctorId,
            appointmentDate: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: { $nin: ['cancelled', 'no-show'] }
        });
        
        // Filter out booked slots
        const availableSlots = allSlots.filter(slot => {
            return !existingAppointments.some(appointment => {
                return appointment.startTime === slot.startTime;
            });
        });
        
        return availableSlots;
    } catch (error) {
        throw new Error(`Failed to get available slots: ${error.message}`);
    }
};

// Get appointment statistics
exports.getAppointmentStats = async (doctorId, period = 'month') => {
    try {
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        const stats = await Appointment.aggregate([
            {
                $match: {
                    doctor: doctorId,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$consultationFee' }
                }
            }
        ]);
        
        const totalAppointments = await Appointment.countDocuments({
            doctor: doctorId,
            createdAt: { $gte: startDate }
        });
        
        const totalRevenue = await Appointment.aggregate([
            {
                $match: {
                    doctor: doctorId,
                    createdAt: { $gte: startDate },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$consultationFee' }
                }
            }
        ]);
        
        return {
            totalAppointments,
            totalRevenue: totalRevenue[0]?.total || 0,
            statusBreakdown: stats,
            period
        };
    } catch (error) {
        throw new Error(`Failed to get appointment stats: ${error.message}`);
    }
};
