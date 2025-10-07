const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    // Basic Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
        match: [/^01[3-9]\d{8}$/, 'Please enter a valid Bangladeshi phone number']
    },
    
    // Professional Information
    specialization: {
        type: String,
        required: [true, 'Specialization is required'],
        trim: true,
        maxlength: [100, 'Specialization cannot exceed 100 characters']
    },
    experience: {
        type: Number,
        required: false,
        min: [0, 'Experience cannot be negative'],
        max: [50, 'Experience cannot exceed 50 years']
    },
    qualification: {
        type: String,
        required: false,
        trim: true,
        maxlength: [200, 'Qualification cannot exceed 200 characters']
    },
    bmdcNumber: {
        type: String,
        required: false,
        unique: true,
        sparse: true, // Allows multiple null values for unique constraint
        trim: true,
        minlength: 6 
    },
    
    // Practice Information
    currentHospital: {
        type: String,
        required: [true, 'Current hospital/clinic is required'],
        trim: true,
        maxlength: [200, 'Hospital name cannot exceed 200 characters']
    },
    consultationFee: {
        type: Number,
        required: [true, 'Consultation fee is required'],
        min: [0, 'Consultation fee cannot be negative']
    },
    
    // Availability
    availableDays: [{
        type: String,
        enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        required: false
    }],
    availableTimeSlots: [{
        day: {
            type: String,
            enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        },
        startTime: {
            type: String,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter time in HH:MM format']
        },
        endTime: {
            type: String,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter time in HH:MM format']
        }
    }],
    
    // Documents - Dynamic system for multiple documents
    documents: [{
        type: {
            type: String,
            required: true,
            enum: [
                'nid_front', 'nid_back', 'passport',
                'bmdc_certificate', 'bmdc_registration',
                'mbbs_degree', 'md_degree', 'fcps_certificate', 'other_degree',
                'experience_certificate', 'hospital_verification',
                'profile_picture', 'signature'
            ]
        },
        url: {
            type: String,
            required: true
        },
        originalName: {
            type: String,
            required: true
        },
        fileSize: {
            type: Number,
            required: true
        },
        mimeType: {
            type: String,
            required: true
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        verified: {
            type: Boolean,
            default: false
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        verifiedAt: Date,
        verificationNotes: String,
        rejected: {
            type: Boolean,
            default: false
        },
        rejectionReason: String
    }],
    
    // Status and Verification
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'suspended'],
        default: 'pending'
    },
    approvedAt: {
        type: Date,
        default: null
    },
    isReadyForVerification: {
        type: Boolean,
        default: false
    },
    verificationNotes: {
        type: String,
        trim: true,
        maxlength: [500, 'Verification notes cannot exceed 500 characters']
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date,
    
    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },
    isAvailable: {
        type: Boolean,
        default: false
    },
    
    // Statistics
    totalAppointments: {
        type: Number,
        default: 0
    },
    completedAppointments: {
        type: Number,
        default: 0
    },
    rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 }
    },
    
    // Timestamps
    lastLoginAt: Date,
    passwordChangedAt: Date
}, {
    timestamps: true
});

// Indexes for better performance
doctorSchema.index({ email: 1 });
doctorSchema.index({ phone: 1 });
doctorSchema.index({ bmdcNumber: 1 });
doctorSchema.index({ status: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ isActive: 1, isAvailable: 1 });

// Virtual for full name
doctorSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Method to check if doctor is verified
doctorSchema.methods.isVerified = function() {
    return this.status === 'approved' && this.isActive;
};

// Method to get public profile
doctorSchema.methods.getPublicProfile = function() {
    // Get profile picture from documents
    const profilePicture = this.documents.find(doc => doc.type === 'profile_picture');
    
    return {
        id: this._id,
        firstName: this.firstName,
        lastName: this.lastName,
        name: this.fullName,
        specialization: this.specialization,
        experience: this.experience,
        qualification: this.qualification,
        currentHospital: this.currentHospital,
        consultationFee: this.consultationFee,
        availableDays: this.availableDays,
        availableTimeSlots: this.availableTimeSlots,
        rating: this.rating,
        isAvailable: this.isAvailable,
        profilePicture: profilePicture?.url,
        status: this.status,
        isReadyForVerification: this.isReadyForVerification
    };
};

// Method to get documents by type
doctorSchema.methods.getDocumentsByType = function(type) {
    return this.documents.filter(doc => doc.type === type);
};

// Method to get verified documents
doctorSchema.methods.getVerifiedDocuments = function() {
    return this.documents.filter(doc => doc.verified && !doc.rejected);
};

// Method to get pending documents
doctorSchema.methods.getPendingDocuments = function() {
    return this.documents.filter(doc => !doc.verified && !doc.rejected);
};

// Pre-save middleware
doctorSchema.pre('save', function(next) {
    // Convert phone to standard format
    if (this.phone && !this.phone.startsWith('01')) {
        this.phone = this.phone.replace(/^\+880/, '').replace(/^880/, '');
    }
    next();
});

module.exports = mongoose.model('Doctor', doctorSchema);
