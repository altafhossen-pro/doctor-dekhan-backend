const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    // Log identification
    level: {
        type: String,
        required: true,
        enum: ['error', 'warn', 'info', 'debug'],
        default: 'info'
    },
    message: {
        type: String,
        required: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    
    // Source information
    source: {
        type: String,
        required: true,
        enum: ['frontend', 'backend', 'database', 'api', 'system']
    },
    component: {
        type: String,
        required: false,
        maxlength: [100, 'Component name cannot exceed 100 characters']
    },
    
    // Error details
    error: {
        name: String,
        message: String,
        stack: String,
        code: String
    },
    
    // Request information
    request: {
        method: String,
        url: String,
        userAgent: String,
        ip: String,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    },
    
    // Additional context
    context: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Metadata
    tags: [{
        type: String,
        maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    
    // Status
    resolved: {
        type: Boolean,
        default: false
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: Date,
    resolutionNotes: String,
    
    // Timestamps
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Indexes for better performance
logSchema.index({ level: 1, timestamp: -1 });
logSchema.index({ source: 1, timestamp: -1 });
logSchema.index({ 'request.userId': 1, timestamp: -1 });
logSchema.index({ 'request.doctorId': 1, timestamp: -1 });
logSchema.index({ resolved: 1, timestamp: -1 });
logSchema.index({ tags: 1, timestamp: -1 });

// Text search index
logSchema.index({ 
    message: 'text', 
    'error.message': 'text',
    'context': 'text'
});

// Method to mark as resolved
logSchema.methods.markAsResolved = function(userId, notes) {
    this.resolved = true;
    this.resolvedBy = userId;
    this.resolvedAt = new Date();
    this.resolutionNotes = notes;
    return this.save();
};

// Static method to get error statistics
logSchema.statics.getErrorStats = function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                timestamp: { $gte: startDate, $lte: endDate },
                level: 'error'
            }
        },
        {
            $group: {
                _id: '$source',
                count: { $sum: 1 },
                resolved: { $sum: { $cond: ['$resolved', 1, 0] } }
            }
        }
    ]);
};

module.exports = mongoose.model('Log', logSchema);
