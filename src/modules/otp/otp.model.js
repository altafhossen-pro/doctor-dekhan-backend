const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^(\+88|88)?01[3-9]\d{8}$/, 'Please enter a valid Bangladeshi phone number']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    otp: {
        type: String,
        required: [true, 'OTP is required'],
        length: [6, 'OTP must be 6 digits']
    },
    type: {
        type: String,
        enum: ['registration', 'login', 'password_reset', 'phone_verification'],
        required: [true, 'OTP type is required']
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    },
    attempts: {
        type: Number,
        default: 0,
        max: [5, 'Maximum 5 attempts allowed']
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    blockedUntil: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for better query performance
otpSchema.index({ phone: 1, type: 1 });
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired OTPs
otpSchema.index({ isUsed: 1 });
otpSchema.index({ isBlocked: 1 });

// Pre-save middleware to generate OTP
otpSchema.pre('save', function(next) {
    if (this.isNew && !this.otp) {
        // Generate 6-digit OTP
        this.otp = Math.floor(100000 + Math.random() * 900000).toString();
    }
    next();
});

// Method to check if OTP is valid
otpSchema.methods.isValid = function() {
    return !this.isUsed && 
           !this.isBlocked && 
           new Date() < this.expiresAt && 
           this.attempts < 5;
};

// Method to mark OTP as used
otpSchema.methods.markAsUsed = function() {
    this.isUsed = true;
    return this.save();
};

// Method to increment attempts
otpSchema.methods.incrementAttempts = function() {
    this.attempts += 1;
    if (this.attempts >= 5) {
        this.isBlocked = true;
        this.blockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Block for 30 minutes
    }
    return this.save();
};

// Static method to find valid OTP
otpSchema.statics.findValidOTP = function(phone, otp, type) {
    return this.findOne({
        phone,
        otp,
        type,
        isUsed: false,
        isBlocked: false,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: 5 }
    });
};

// Static method to find latest OTP for phone
otpSchema.statics.findLatestOTP = function(phone, type) {
    return this.findOne({
        phone,
        type,
        isUsed: false,
        isBlocked: false,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
};

// Static method to clean expired OTPs
otpSchema.statics.cleanExpiredOTPs = function() {
    return this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isUsed: true, createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Delete used OTPs older than 24 hours
        ]
    });
};

module.exports = mongoose.model('OTP', otpSchema);
