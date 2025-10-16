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
    
    // Unique Identifiers
    slug: {
        type: String,
        required: [true, 'Slug is required'],
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: [100, 'Slug cannot exceed 100 characters']
    },
    doctorUID: {
        type: String,
        required: [true, 'Doctor UID is required'],
        unique: true,
        trim: true,
        match: [/^11\d{2,4}$/, 'Doctor UID must be 4-6 digits starting with 11']
    },
    
    // Professional Information
    departments: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: true
        }],
        validate: {
            validator: function(departments) {
                return departments && departments.length >= 1 && departments.length <= 3;
            },
            message: 'Doctor must have at least 1 and at most 3 departments'
        },
        required: [true, 'At least one department is required']
    },
    // Currently active/approved pricing for appointments
    approvedDepartmentPricing: [{
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: true
        },
        fee: {
            type: Number,
            required: true,
            min: [0, 'Department fee cannot be negative']
        },
        approvedAt: {
            type: Date,
            default: Date.now
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    // Pending pricing updates waiting for admin approval
    pendingDepartmentPricing: [{
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: true
        },
        fee: {
            type: Number,
            required: true,
            min: [0, 'Department fee cannot be negative']
        },
        submittedAt: {
            type: Date,
            default: Date.now
        },
        previousFee: {
            type: Number,
            required: true
        }
    }],
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
        minlength: 4 
    },
    
    // Practice Information
    currentHospital: {
        type: String,
        required: [true, 'Current hospital/clinic is required'],
        trim: true,
        maxlength: [200, 'Hospital name cannot exceed 200 characters']
    },
    
    // Profile Picture
    profilePicture: {
        type: String,
        default: null
    },
    
    // Availability
    availableDays: [{
        type: String,
        enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        required: false
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
    isCurrentlyHaveEditProfile: {
        type: Boolean,
        default: true
    },
    isVerificationStatusSended: {
        type: Boolean,
        default: false
    },
    canEditPricing: {
        type: Boolean,
        default: true
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
doctorSchema.index({ bmdcNumber: 1 }, { sparse: true }); // Sparse index allows multiple null values
doctorSchema.index({ status: 1 });
doctorSchema.index({ departments: 1 });
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
    return {
        id: this._id,
        firstName: this.firstName,
        lastName: this.lastName,
        slug: this.slug,
        name: this.fullName,
        departments: this.departments,
        approvedDepartmentPricing: this.approvedDepartmentPricing,
        pendingDepartmentPricing: this.pendingDepartmentPricing,
        experience: this.experience,
        qualification: this.qualification,
        bmdcNumber: this.bmdcNumber,
        currentHospital: this.currentHospital,
        availableDays: this.availableDays,
        rating: this.rating,
        isAvailable: this.isAvailable,
        profilePicture: this.profilePicture,
        status: this.status,
        isCurrentlyHaveEditProfile: this.isCurrentlyHaveEditProfile,
        isVerificationStatusSended: this.isVerificationStatusSended
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

// Method to get approved department pricing for a specific department
doctorSchema.methods.getApprovedDepartmentPricing = function(departmentId) {
    if (departmentId) {
        return this.approvedDepartmentPricing.find(p => p.department.toString() === departmentId.toString());
    }
    return this.approvedDepartmentPricing;
};

// Method to get pending department pricing for a specific department
doctorSchema.methods.getPendingDepartmentPricing = function(departmentId) {
    if (departmentId) {
        return this.pendingDepartmentPricing.find(p => p.department.toString() === departmentId.toString());
    }
    return this.pendingDepartmentPricing;
};

// Method to check if doctor can edit pricing
doctorSchema.methods.canEditPricingNow = function() {
    return this.canEditPricing && this.isCurrentlyHaveEditProfile;
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
