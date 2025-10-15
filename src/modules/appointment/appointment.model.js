const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  appointmentType: {
    type: String,
    enum: ['consultation', 'follow-up', 'emergency', 'routine'],
    default: 'consultation'
  },
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  consultationFee: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'insurance'],
    default: 'cash'
  },
  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  // For tracking appointment history
  createdBy: {
    type: String,
    enum: ['doctor', 'user', 'admin'],
    default: 'user'
  },
  cancelledBy: {
    type: String,
    enum: ['doctor', 'user', 'admin', 'system']
  },
  cancellationReason: {
    type: String,
    maxlength: 500
  },
  cancelledAt: {
    type: Date
  },
  // For reminders and notifications
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: {
    type: Date
  },
  // For rescheduling
  isRescheduled: {
    type: Boolean,
    default: false
  },
  originalAppointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  rescheduledFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
appointmentSchema.index({ user: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointmentDate: 1, startTime: 1 });
appointmentSchema.index({ doctor: 1, status: 1 });

// Virtual for appointment duration
appointmentSchema.virtual('duration').get(function() {
  const start = this.startTime.split(':');
  const end = this.endTime.split(':');
  
  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
  
  return endMinutes - startMinutes;
});

// Virtual for formatted appointment time
appointmentSchema.virtual('formattedTime').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// Method to check if appointment is in the past
appointmentSchema.methods.isPast = function() {
  const now = new Date();
  const appointmentDateTime = new Date(this.appointmentDate);
  
  // Set the time for the appointment
  const [hours, minutes] = this.startTime.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  return appointmentDateTime < now;
};

// Method to check if appointment is today
appointmentSchema.methods.isToday = function() {
  const today = new Date();
  const appointmentDate = new Date(this.appointmentDate);
  
  return today.toDateString() === appointmentDate.toDateString();
};

// Method to check if appointment is upcoming (within next 24 hours)
appointmentSchema.methods.isUpcoming = function() {
  const now = new Date();
  const appointmentDateTime = new Date(this.appointmentDate);
  
  // Set the time for the appointment
  const [hours, minutes] = this.startTime.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const diffInHours = (appointmentDateTime - now) / (1000 * 60 * 60);
  return diffInHours > 0 && diffInHours <= 24;
};

// Pre-save middleware to validate appointment logic
appointmentSchema.pre('save', function(next) {
  // Validate that end time is after start time
  const start = this.startTime.split(':');
  const end = this.endTime.split(':');
  
  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
  
  if (endMinutes <= startMinutes) {
    return next(new Error('End time must be after start time'));
  }
  
  // Validate appointment date is not in the past (except for rescheduling)
  if (!this.isRescheduled && this.isPast()) {
    return next(new Error('Cannot create appointment in the past'));
  }
  
  next();
});

// Static method to find appointments by date range
appointmentSchema.statics.findByDateRange = function(doctorId, startDate, endDate) {
  return this.find({
    doctor: doctorId,
    appointmentDate: {
      $gte: startDate,
      $lte: endDate
    },
    status: { $nin: ['cancelled'] }
  }).populate('user', 'firstName lastName email phone');
};

// Static method to find available time slots
appointmentSchema.statics.findAvailableSlots = async function(doctorId, date, timeSlots) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const existingAppointments = await this.find({
    doctor: doctorId,
    appointmentDate: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    status: { $nin: ['cancelled', 'no-show'] }
  });
  
  // Filter out booked slots
  const availableSlots = timeSlots.filter(slot => {
    return !existingAppointments.some(appointment => {
      return appointment.startTime === slot.startTime;
    });
  });
  
  return availableSlots;
};

module.exports = mongoose.model('Appointment', appointmentSchema);
