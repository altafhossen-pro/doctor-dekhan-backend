const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true, // e.g., "Cardiology", "Dermatology"
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: false, // Auto-generated from name
    unique: true, // auto-generate from name for URLs
    trim: true,
    lowercase: true,
    maxlength: [100, 'Slug cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  icon: {
    type: String, // optional, for frontend icon (e.g., "heart", "stethoscope")
    trim: true
  },
  image: {
    type: String, // optional, banner image
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Additional fields for doctor appointment site
  color: {
    type: String, // hex color code for UI theming
    default: '#3B82F6',
    match: [/^#[0-9A-F]{6}$/i, 'Please provide a valid hex color code']
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: [0, 'Sort order cannot be negative']
  },
  
  
  // SEO fields
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot exceed 60 characters']
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  
  // Admin management
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true 
});

// Indexes for better performance
departmentSchema.index({ name: 1 });
departmentSchema.index({ slug: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ sortOrder: 1 });

// Virtual for public department info
departmentSchema.virtual('publicInfo').get(function() {
  return {
    id: this._id,
    name: this.name,
    slug: this.slug,
    description: this.description,
    icon: this.icon,
    image: this.image,
    color: this.color,
    isActive: this.isActive
  };
});

// Method to check if department is active
departmentSchema.methods.isActiveDepartment = function() {
  return this.isActive;
};

// Method to get department basic info
departmentSchema.methods.getBasicInfo = function() {
  return {
    id: this._id,
    name: this.name,
    slug: this.slug,
    isActive: this.isActive
  };
};

// Pre-save middleware to generate slug from name
departmentSchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }
  next();
});

// Static method to find active departments
departmentSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
};

// Static method to find by slug
departmentSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, isActive: true });
};

module.exports = mongoose.model('Department', departmentSchema);
