const TimeSlot = require('./timeslot.model');
const Appointment = require('../appointment/appointment.model');

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

// Get available slots for a date range
exports.getAvailableSlotsRange = async (doctorId, startDate, endDate) => {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const allAvailableSlots = [];
        
        // Get all time slots for this doctor
        const timeSlots = await TimeSlot.find({
            doctor: doctorId,
            isActive: true
        });
        
        if (!timeSlots || timeSlots.length === 0) {
            return [];
        }
        
        // Day mapping: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        // Iterate through each day in the range
        for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
            const dayOfWeekNumber = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const dayOfWeekName = dayNames[dayOfWeekNumber]; // Convert to lowercase name
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // Find time slot for this day of week
            const timeSlot = timeSlots.find(slot => slot.dayOfWeek === dayOfWeekName);
            
            if (timeSlot) {
                // Generate slots for this day
                const daySlots = timeSlot.generateSlots();
                
                // Get existing appointments for this date
                const startOfDay = new Date(dateStr);
                startOfDay.setHours(0, 0, 0, 0);
                
                const endOfDay = new Date(dateStr);
                endOfDay.setHours(23, 59, 59, 999);
                
                const existingAppointments = await Appointment.find({
                    doctor: doctorId,
                    appointmentDate: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    },
                    status: { $nin: ['cancelled', 'no-show'] }
                });
                
                // Add date to each slot with availability check
                daySlots.forEach((slot, index) => {
                    // Check if this slot is already booked
                    const isBooked = existingAppointments.some(appointment => {
                        return appointment.startTime === slot.startTime;
                    });
                    
                    // Calculate available appointments for this slot
                    const bookedCount = existingAppointments.filter(appointment => 
                        appointment.startTime === slot.startTime
                    ).length;
                    
                    const availableCount = timeSlot.maxAppointments - bookedCount;
                    const isAvailable = availableCount > 0;
                    
                    allAvailableSlots.push({
                        ...slot,
                        date: dateStr,
                        time: slot.startTime, // Use startTime as the display time
                        slotId: `${timeSlot._id}_${dateStr}_${index}`,
                        isAvailable: isAvailable,
                        maxAppointments: timeSlot.maxAppointments,
                        availableCount: availableCount,
                        bookedCount: bookedCount
                    });
                });
            }
        }
        
        return allAvailableSlots;
    } catch (error) {
        throw new Error(`Failed to get available slots range: ${error.message}`);
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
