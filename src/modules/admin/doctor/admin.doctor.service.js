const Doctor = require("../../doctor/doctor.model");

exports.getAllDoctorsForAdmin = async ({ page, limit, search, status, sortBy, sortOrder }) => {
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
        
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Calculate pagination
        const skip = (page - 1) * limit;
        
        // Execute query with pagination
        const doctors = await Doctor.find(query)
            .select('-password') // Exclude password field
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
            .populate('department', 'name slug description icon color')
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
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            {
                status: updateData.status,
                rejectionReason: updateData.rejectionReason,
                updatedBy: updateData.updatedBy,
                updatedAt: new Date()
            },
            { new: true }
        ).select('-password');

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
        
        // Get recent registrations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentRegistrations = await Doctor.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
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
            doctorsBySpecialization
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
        ).populate('department', 'name slug description icon color');

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
        ).populate('department', 'name slug description icon color');

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw new Error(`Failed to update doctor: ${error.message}`);
    }
};
