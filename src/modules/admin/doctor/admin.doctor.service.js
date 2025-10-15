const Doctor = require("../../doctor/doctor.model");

exports.getAllDoctorsForAdmin = async ({ page, limit, search, status, isVerificationStatusSended, sortBy, sortOrder }) => {
    try {
        // Build query object
        const query = {};
        
        // Add search functionality
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { specialization: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Add status filter
        if (status && status !== 'all') {
            query.status = status;
        }
        
        // Add verification status filter
        if (isVerificationStatusSended !== undefined) {
            query.isVerificationStatusSended = isVerificationStatusSended === 'true';
        }
        
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Calculate pagination
        const skip = (page - 1) * limit;
        
        // Execute query with pagination
        const doctors = await Doctor.find(query)
            .select('-password') // Exclude password field
            .populate('departments', 'name slug description icon color') // Populate departments
            .populate('approvedDepartmentPricing.department', 'name slug description icon color') // Populate approved pricing departments
            .populate('pendingDepartmentPricing.department', 'name slug description icon color') // Populate pending pricing departments
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
        
        // Get total count for pagination
        const total = await Doctor.countDocuments(query);
        
        // Calculate pagination info
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        return {
            doctors,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount: total,
                totalDoctors: total,
                hasNextPage,
                hasPrevPage,
                limit
            }
        };
    } catch (error) {
        throw new Error(`Failed to fetch doctors: ${error.message}`);
    }
};

exports.approveDoctorProfile = async (doctorId) => {
    const doctor = await Doctor.findByIdAndUpdate(doctorId, {
        status: 'approved',
        approvedAt: new Date()
    });
    if (!doctor) {
        throw new Error('Doctor not found');
    }
    return doctor;
}

exports.getDoctorProfile = async (doctorId) => {
    try {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            throw new Error('Doctor not found');
        }
        return doctor;
    } catch (error) {
        throw new Error(`Failed to fetch doctor profile: ${error.message}`);
    }
};

exports.getDoctorById = async (doctorId) => {
    try {
        const doctor = await Doctor.findById(doctorId)
            .populate('departments', 'name slug description icon color')
            .populate('approvedDepartmentPricing.department', 'name slug description icon color')
            .populate('pendingDepartmentPricing.department', 'name slug description icon color')
            .select('-password');
        if (!doctor) {
            throw new Error('Doctor not found');
        }
        return doctor;
    } catch (error) {
        throw new Error(`Failed to fetch doctor: ${error.message}`);
    }
};

exports.updateDoctorStatus = async (doctorId, updateData) => {
    try {
        const updateFields = {
            status: updateData.status,
            rejectionReason: updateData.rejectionReason,
            updatedBy: updateData.updatedBy,
            updatedAt: new Date()
        };

        // Add approvedAt timestamp when doctor is approved
        if (updateData.status === 'approved') {
            updateFields.approvedAt = new Date();
        }

        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            updateFields,
            { new: true }
        ).select('-password')
         .populate('departments', 'name slug description icon color')
         .populate('approvedDepartmentPricing.department', 'name slug description icon color')
         .populate('pendingDepartmentPricing.department', 'name slug description icon color');

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw new Error(`Failed to update doctor status: ${error.message}`);
    }
};

exports.deleteDoctor = async (doctorId) => {
    try {
        const doctor = await Doctor.findByIdAndDelete(doctorId);
        if (!doctor) {
            throw new Error('Doctor not found');
        }
        return doctor;
    } catch (error) {
        throw new Error(`Failed to delete doctor: ${error.message}`);
    }
};

exports.getDoctorStats = async () => {
    try {
        const totalDoctors = await Doctor.countDocuments();
        const approvedDoctors = await Doctor.countDocuments({ status: 'approved' });
        const pendingDoctors = await Doctor.countDocuments({ status: 'pending' });
        const rejectedDoctors = await Doctor.countDocuments({ status: 'rejected' });
        
        // Verification specific stats
        const readyForVerification = await Doctor.countDocuments({ 
            isVerificationStatusSended: true, 
            status: 'pending' 
        });
        const documentsPending = await Doctor.countDocuments({ 
            status: 'pending',
            isVerificationStatusSended: false 
        });
        const profileIncomplete = await Doctor.countDocuments({ 
            status: 'pending',
            isVerificationStatusSended: false,
            $or: [
                { firstName: { $exists: false } },
                { lastName: { $exists: false } },
                { specialization: { $exists: false } },
                { qualification: { $exists: false } },
                { bmdcNumber: { $exists: false } }
            ]
        });
        
        // Get recent registrations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentRegistrations = await Doctor.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Get recently approved doctors (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentlyApproved = await Doctor.countDocuments({
            status: 'approved',
            approvedAt: { $gte: sevenDaysAgo }
        });

        // Get recently rejected doctors (last 7 days)
        const recentlyRejected = await Doctor.countDocuments({
            status: 'rejected',
            updatedAt: { $gte: sevenDaysAgo }
        });

        // Get doctors pending resubmission (rejected but can resubmit)
        const pendingResubmission = await Doctor.countDocuments({
            status: 'rejected',
            isVerificationStatusSended: false
        });

        // Get doctors by specialization
        const doctorsBySpecialization = await Doctor.aggregate([
            { $group: { _id: '$specialization', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        return {
            totalDoctors,
            approvedDoctors,
            pendingDoctors,
            rejectedDoctors,
            recentRegistrations,
            doctorsBySpecialization,
            // Verification specific stats
            readyForVerification,
            documentsPending,
            profileIncomplete,
            // Recently approved stats
            recentlyApproved,
            // Recently rejected stats
            recentlyRejected,
            pendingResubmission
        };
    } catch (error) {
        throw new Error(`Failed to fetch doctor statistics: ${error.message}`);
    }
};

// Toggle doctor edit profile permission
exports.toggleEditProfilePermission = async (doctorId, updateData) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            {
                isCurrentlyHaveEditProfile: updateData.isCurrentlyHaveEditProfile,
                updatedBy: updateData.updatedBy
            },
            { new: true, runValidators: true }
        ).populate('departments', 'name slug description icon color')
         .populate('approvedDepartmentPricing.department', 'name slug description icon color')
         .populate('pendingDepartmentPricing.department', 'name slug description icon color');

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw new Error(`Failed to toggle edit profile permission: ${error.message}`);
    }
};

// Update doctor information
exports.updateDoctor = async (doctorId, updateData) => {
    try {
        // Remove fields that shouldn't be updated directly
        const { updatedBy, ...allowedUpdates } = updateData;
        
        // Only allow specific fields to be updated
        const allowedFields = [
            'firstName', 'lastName', 'email', 'phone', 'department',
            'experience', 'qualification', 'bmdcNumber', 'currentHospital',
            'consultationFee'
        ];
        
        const filteredUpdates = {};
        Object.keys(allowedUpdates).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredUpdates[key] = allowedUpdates[key];
            }
        });
        
        // Add updatedBy
        filteredUpdates.updatedBy = updatedBy;

        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            filteredUpdates,
            { new: true, runValidators: true }
        ).populate('departments', 'name slug description icon color')
         .populate('approvedDepartmentPricing.department', 'name slug description icon color')
         .populate('pendingDepartmentPricing.department', 'name slug description icon color');

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw new Error(`Failed to update doctor: ${error.message}`);
    }
};

// Toggle pricing editing for doctor
exports.togglePricingEdit = async (doctorId, canEdit, adminId) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { 
                canEditPricing: canEdit,
                updatedBy: adminId
            },
            { new: true, runValidators: true }
        ).populate('departments', 'name slug description icon color')
         .populate('approvedDepartmentPricing.department', 'name')
         .populate('pendingDepartmentPricing.department', 'name');

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw new Error(`Failed to toggle pricing edit: ${error.message}`);
    }
};

// Approve pending pricing updates
exports.approvePendingPricing = async (doctorId, adminId) => {
    try {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        if (!doctor.pendingDepartmentPricing || doctor.pendingDepartmentPricing.length === 0) {
            throw new Error('No pending pricing updates found');
        }

        // Move pending pricing to approved pricing
        doctor.pendingDepartmentPricing.forEach(pendingPricing => {
            // Remove existing approved pricing for this department
            doctor.approvedDepartmentPricing = doctor.approvedDepartmentPricing.filter(p => 
                p.department.toString() !== pendingPricing.department.toString()
            );
            
            // Add new approved pricing
            doctor.approvedDepartmentPricing.push({
                department: pendingPricing.department,
                fee: pendingPricing.fee,
                approvedAt: new Date(),
                approvedBy: adminId
            });
        });
        
        // Clear pending pricing
        doctor.pendingDepartmentPricing = [];

        await doctor.save();

        return await Doctor.findById(doctorId)
            .populate('departments', 'name slug description icon color')
            .populate('approvedDepartmentPricing.department', 'name')
            .populate('pendingDepartmentPricing.department', 'name');
    } catch (error) {
        throw new Error(`Failed to approve pending pricing: ${error.message}`);
    }
};

// Reject pending pricing updates
exports.rejectPendingPricing = async (doctorId, adminId, reason) => {
    try {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        if (!doctor.pendingDepartmentPricing || doctor.pendingDepartmentPricing.length === 0) {
            throw new Error('No pending pricing updates found');
        }

        // Clear pending pricing
        doctor.pendingDepartmentPricing = [];

        await doctor.save();

        return await Doctor.findById(doctorId)
            .populate('departments', 'name slug description icon color')
            .populate('approvedDepartmentPricing.department', 'name')
            .populate('pendingDepartmentPricing.department', 'name');
    } catch (error) {
        throw new Error(`Failed to reject pending pricing: ${error.message}`);
    }
};

// Get doctors with pending pricing updates
exports.getDoctorsWithPendingPricing = async ({ page, limit }) => {
    try {
        const skip = (page - 1) * limit;
        
        const doctors = await Doctor.find({
            'pendingDepartmentPricing.0': { $exists: true }
        })
        .select('-password')
        .populate('departments', 'name slug description icon color')
        .populate('approvedDepartmentPricing.department', 'name')
        .populate('pendingDepartmentPricing.department', 'name')
        .sort({ 'pendingDepartmentPricing.submittedAt': -1 })
        .skip(skip)
        .limit(limit)
        .lean();
        
        const total = await Doctor.countDocuments({
            'pendingDepartmentPricing.0': { $exists: true }
        });
        
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        return {
            doctors,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount: total,
                hasNextPage,
                hasPrevPage
            }
        };
    } catch (error) {
        throw new Error(`Failed to get doctors with pending pricing: ${error.message}`);
    }
};