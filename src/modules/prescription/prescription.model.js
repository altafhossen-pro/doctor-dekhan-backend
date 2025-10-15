const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    unique: true
  },
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
  diagnosis: {
    type: String,
    required: true,
    maxlength: 1000
  },
  symptoms: [{
    type: String,
    maxlength: 200
  }],
  medications: [{
    name: {
      type: String,
      required: true,
      maxlength: 200
    },
    dosage: {
      type: String,
      required: true,
      maxlength: 100
    },
    frequency: {
      type: String,
      required: true,
      maxlength: 100
    },
    duration: {
      type: String,
      required: true,
      maxlength: 100
    },
    instructions: {
      type: String,
      maxlength: 500
    },
    quantity: {
      type: Number,
      min: 1
    }
  }],
  tests: [{
    name: {
      type: String,
      required: true,
      maxlength: 200
    },
    description: {
      type: String,
      maxlength: 500
    },
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'emergency'],
      default: 'routine'
    }
  }],
  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    date: {
      type: Date
    },
    notes: {
      type: String,
      maxlength: 500
    }
  },
  generalAdvice: {
    type: String,
    maxlength: 1000
  },
  dietAdvice: {
    type: String,
    maxlength: 500
  },
  lifestyleAdvice: {
    type: String,
    maxlength: 500
  },
  restrictions: {
    type: String,
    maxlength: 500
  },
  // For prescription validity
  validUntil: {
    type: Date,
    default: function() {
      // Prescription valid for 30 days by default
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // For digital signature or verification
  doctorSignature: {
    type: String
  },
  prescriptionNumber: {
    type: String,
    unique: true,
    required: true
  },
  // For tracking prescription history
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
prescriptionSchema.index({ appointment: 1 });
prescriptionSchema.index({ doctor: 1, createdAt: -1 });
prescriptionSchema.index({ user: 1, createdAt: -1 });
prescriptionSchema.index({ prescriptionNumber: 1 });
prescriptionSchema.index({ validUntil: 1, isActive: 1 });

// Pre-save middleware to generate prescription number
prescriptionSchema.pre('save', async function(next) {
  if (!this.prescriptionNumber) {
    const count = await this.constructor.countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    this.prescriptionNumber = `RX${year}${month}${day}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Method to check if prescription is valid
prescriptionSchema.methods.isValid = function() {
  return this.isActive && new Date() <= this.validUntil;
};

// Method to get prescription summary
prescriptionSchema.methods.getSummary = function() {
  return {
    prescriptionNumber: this.prescriptionNumber,
    diagnosis: this.diagnosis,
    medicationCount: this.medications.length,
    testCount: this.tests.length,
    followUpRequired: this.followUp.required,
    validUntil: this.validUntil,
    isActive: this.isActive
  };
};

// Virtual for formatted prescription date
prescriptionSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Static method to find prescriptions by date range
prescriptionSchema.statics.findByDateRange = function(doctorId, startDate, endDate) {
  return this.find({
    doctor: doctorId,
    createdAt: {
      $gte: startDate,
      $lte: endDate
    },
    isActive: true
  }).populate('appointment user');
};

// Static method to find expired prescriptions
prescriptionSchema.statics.findExpired = function() {
  return this.find({
    validUntil: { $lt: new Date() },
    isActive: true
  });
};

module.exports = mongoose.model('Prescription', prescriptionSchema);
