const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  dayOfWeek: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        // Validate time format (HH:MM)
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        // Validate time format (HH:MM)
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  slotDuration: {
    type: Number,
    required: true,
    min: 10,
    max: 120,
    default: 15
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxAppointments: {
    type: Number,
    default: 1,
    min: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
timeSlotSchema.index({ doctor: 1, dayOfWeek: 1 });
timeSlotSchema.index({ doctor: 1, isActive: 1 });

// Virtual to calculate total slots for this time period
timeSlotSchema.virtual('totalSlots').get(function () {
  const start = this.startTime.split(':');
  const end = this.endTime.split(':');

  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);

  const totalMinutes = endMinutes - startMinutes;
  return Math.floor(totalMinutes / this.slotDuration);
});

// Method to generate all possible slots for this time period
timeSlotSchema.methods.generateSlots = function () {
  const slots = [];
  const start = this.startTime.split(':');
  const end = this.endTime.split(':');

  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);

  let currentMinutes = startMinutes;

  while (currentMinutes + this.slotDuration <= endMinutes) {
    const slotStart = this.formatMinutesToTime(currentMinutes);
    const slotEnd = this.formatMinutesToTime(currentMinutes + this.slotDuration);

    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      duration: this.slotDuration
    });

    currentMinutes += this.slotDuration;
  }

  return slots;
};

// Helper method to format minutes to time string
timeSlotSchema.methods.formatMinutesToTime = function (minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Pre-save middleware to validate time logic
timeSlotSchema.pre('save', function (next) {
  const start = this.startTime.split(':');
  const end = this.endTime.split(':');

  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);

  if (endMinutes <= startMinutes) {
    return next(new Error('End time must be after start time'));
  }

  const totalMinutes = endMinutes - startMinutes;
  if (totalMinutes < this.slotDuration) {
    return next(new Error('Time period must be at least as long as slot duration'));
  }

  next();
});

module.exports = mongoose.model('TimeSlot', timeSlotSchema);
