const TimeSlot = require('./timeslot.model');

// Create or update time slot for a doctor
exports.createOrUpdateTimeSlot = async (doctorId, timeSlotData) => {
    try {
        const { dayOfWeek, startTime, endTime, slotDuration, maxAppointments } = timeSlotData;
        
        // Check if time slot already exists for this doctor and day
        const existingSlot = await TimeSlot.findOne({
            doctor: doctorId,
            dayOfWeek: dayOfWeek
        });
        
        if (existingSlot) {
            // Update existing slot
            existingSlot.startTime = startTime;
            existingSlot.endTime = endTime;
            existingSlot.slotDuration = slotDuration;
            existingSlot.maxAppointments = maxAppointments || 1;
            existingSlot.isActive = true;
            
            return await existingSlot.save();
        } else {
            // Create new slot
            const newTimeSlot = new TimeSlot({
                doctor: doctorId,
                dayOfWeek,
                startTime,
                endTime,
                slotDuration,
                maxAppointments: maxAppointments || 1,
                isActive: true
            });
            
            return await newTimeSlot.save();
        }
    } catch (error) {
        throw new Error(`Failed to create/update time slot: ${error.message}`);
    }
};

// Get all time slots for a doctor
exports.getDoctorTimeSlots = async (doctorId) => {
    try {
        const timeSlots = await TimeSlot.find({
            doctor: doctorId,
            isActive: true
        }).sort({ dayOfWeek: 1 });
        
        return timeSlots;
    } catch (error) {
        throw new Error(`Failed to fetch doctor time slots: ${error.message}`);
    }
};

// Get time slots for a specific day
exports.getTimeSlotsByDay = async (doctorId, dayOfWeek) => {
    try {
        const timeSlot = await TimeSlot.findOne({
            doctor: doctorId,
            dayOfWeek: dayOfWeek,
            isActive: true
        });
        
        return timeSlot;
    } catch (error) {
        throw new Error(`Failed to fetch time slot for day: ${error.message}`);
    }
};

// Delete time slot
exports.deleteTimeSlot = async (timeSlotId) => {
    try {
        const timeSlot = await TimeSlot.findByIdAndUpdate(
            timeSlotId,
            { isActive: false },
            { new: true }
        );
        
        if (!timeSlot) {
            throw new Error('Time slot not found');
        }
        
        return timeSlot;
    } catch (error) {
        throw new Error(`Failed to delete time slot: ${error.message}`);
    }
};

// Get available slots for a specific date
exports.getAvailableSlots = async (doctorId, date, dayOfWeek) => {
    try {
        const timeSlot = await TimeSlot.findOne({
            doctor: doctorId,
            dayOfWeek: dayOfWeek,
            isActive: true
        });
        
        if (!timeSlot) {
            return [];
        }
        
        // Generate all possible slots for this time period
        const allSlots = timeSlot.generateSlots();
        
        // Here you would typically check against existing appointments
        // to filter out already booked slots
        // For now, returning all generated slots
        
        return allSlots.map((slot, index) => ({
            ...slot,
            slotId: `${timeSlot._id}_${index}`,
            isAvailable: true,
            maxAppointments: timeSlot.maxAppointments
        }));
    } catch (error) {
        throw new Error(`Failed to get available slots: ${error.message}`);
    }
};

// Toggle time slot active status
exports.toggleTimeSlotStatus = async (timeSlotId, isActive) => {
    try {
        const timeSlot = await TimeSlot.findByIdAndUpdate(
            timeSlotId,
            { isActive: isActive },
            { new: true }
        );
        
        if (!timeSlot) {
            throw new Error('Time slot not found');
        }
        
        return timeSlot;
    } catch (error) {
        throw new Error(`Failed to toggle time slot status: ${error.message}`);
    }
};

// Get time slot statistics for a doctor
exports.getTimeSlotStats = async (doctorId) => {
    try {
        const timeSlots = await TimeSlot.find({
            doctor: doctorId,
            isActive: true
        });
        
        const stats = {
            totalDays: timeSlots.length,
            totalSlots: 0,
            averageSlotDuration: 0,
            totalHours: 0
        };
        
        let totalDuration = 0;
        let totalMinutes = 0;
        
        timeSlots.forEach(slot => {
            const start = slot.startTime.split(':');
            const end = slot.endTime.split(':');
            
            const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
            const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
            
            const dayMinutes = endMinutes - startMinutes;
            totalMinutes += dayMinutes;
            
            const daySlots = Math.floor(dayMinutes / slot.slotDuration);
            stats.totalSlots += daySlots;
            
            totalDuration += slot.slotDuration;
        });
        
        if (timeSlots.length > 0) {
            stats.averageSlotDuration = Math.round(totalDuration / timeSlots.length);
            stats.totalHours = Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal
        }
        
        return stats;
    } catch (error) {
        throw new Error(`Failed to get time slot stats: ${error.message}`);
    }
};
