const Prescription = require('./prescription.model');
const Appointment = require('../appointment/appointment.model');

// Create new prescription
exports.createPrescription = async (prescriptionData) => {
    try {
        const { appointment, doctor, user, diagnosis, symptoms, medications, tests, followUp, generalAdvice, dietAdvice, lifestyleAdvice, restrictions } = prescriptionData;
        
        // Check if appointment exists and is completed
        const appointmentExists = await Appointment.findById(appointment);
        if (!appointmentExists) {
            throw new Error('Appointment not found');
        }
        
        if (appointmentExists.status !== 'completed') {
            throw new Error('Can only create prescription for completed appointments');
        }
        
        // Check if prescription already exists for this appointment
        const existingPrescription = await Prescription.findOne({ appointment });
        if (existingPrescription) {
            throw new Error('Prescription already exists for this appointment');
        }
        
        const prescription = new Prescription({
            appointment,
            doctor,
            user,
            diagnosis,
            symptoms: symptoms || [],
            medications: medications || [],
            tests: tests || [],
            followUp: followUp || { required: false },
            generalAdvice,
            dietAdvice,
            lifestyleAdvice,
            restrictions,
            createdBy: doctor
        });
        
        return await prescription.save();
    } catch (error) {
        throw new Error(`Failed to create prescription: ${error.message}`);
    }
};

// Get prescriptions for a doctor
exports.getDoctorPrescriptions = async (doctorId, filters = {}) => {
    try {
        const { page = 1, limit = 10, date, isActive = true } = filters;
        
        const query = { doctor: doctorId };
        
        if (isActive !== undefined) {
            query.isActive = isActive;
        }
        
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            
            query.createdAt = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }
        
        const prescriptions = await Prescription.find(query)
            .populate('appointment', 'appointmentDate startTime endTime reason')
            .populate('user', 'firstName lastName email phone')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        
        const total = await Prescription.countDocuments(query);
        
        return {
            prescriptions,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalCount: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        };
    } catch (error) {
        throw new Error(`Failed to fetch doctor prescriptions: ${error.message}`);
    }
};

// Get prescriptions for a user
exports.getUserPrescriptions = async (userId, filters = {}) => {
    try {
        const { page = 1, limit = 10, isActive = true } = filters;
        
        const query = { user: userId };
        
        if (isActive !== undefined) {
            query.isActive = isActive;
        }
        
        const prescriptions = await Prescription.find(query)
            .populate('appointment', 'appointmentDate startTime endTime reason')
            .populate('doctor', 'firstName lastName specialization')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        
        const total = await Prescription.countDocuments(query);
        
        return {
            prescriptions,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalCount: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        };
    } catch (error) {
        throw new Error(`Failed to fetch user prescriptions: ${error.message}`);
    }
};

// Get single prescription by ID
exports.getPrescriptionById = async (prescriptionId) => {
    try {
        const prescription = await Prescription.findById(prescriptionId)
            .populate('appointment', 'appointmentDate startTime endTime reason')
            .populate('doctor', 'firstName lastName specialization')
            .populate('user', 'firstName lastName email phone');
        
        if (!prescription) {
            throw new Error('Prescription not found');
        }
        
        return prescription;
    } catch (error) {
        throw new Error(`Failed to fetch prescription: ${error.message}`);
    }
};

// Update prescription
exports.updatePrescription = async (prescriptionId, updateData, updatedBy) => {
    try {
        const prescription = await Prescription.findById(prescriptionId);
        
        if (!prescription) {
            throw new Error('Prescription not found');
        }
        
        // Check if prescription is still valid (not expired)
        if (!prescription.isValid()) {
            throw new Error('Cannot update expired prescription');
        }
        
        // Update fields
        const allowedFields = ['diagnosis', 'symptoms', 'medications', 'tests', 'followUp', 'generalAdvice', 'dietAdvice', 'lifestyleAdvice', 'restrictions'];
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                prescription[field] = updateData[field];
            }
        });
        
        prescription.updatedBy = updatedBy;
        
        return await prescription.save();
    } catch (error) {
        throw new Error(`Failed to update prescription: ${error.message}`);
    }
};

// Deactivate prescription
exports.deactivatePrescription = async (prescriptionId, deactivatedBy) => {
    try {
        const prescription = await Prescription.findById(prescriptionId);
        
        if (!prescription) {
            throw new Error('Prescription not found');
        }
        
        prescription.isActive = false;
        prescription.updatedBy = deactivatedBy;
        
        return await prescription.save();
    } catch (error) {
        throw new Error(`Failed to deactivate prescription: ${error.message}`);
    }
};

// Get prescription statistics
exports.getPrescriptionStats = async (doctorId, period = 'month') => {
    try {
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        const stats = await Prescription.aggregate([
            {
                $match: {
                    doctor: doctorId,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalPrescriptions: { $sum: 1 },
                    totalMedications: { $sum: { $size: '$medications' } },
                    totalTests: { $sum: { $size: '$tests' } },
                    followUpRequired: {
                        $sum: {
                            $cond: ['$followUp.required', 1, 0]
                        }
                    }
                }
            }
        ]);
        
        const activePrescriptions = await Prescription.countDocuments({
            doctor: doctorId,
            isActive: true,
            validUntil: { $gte: new Date() }
        });
        
        const expiredPrescriptions = await Prescription.countDocuments({
            doctor: doctorId,
            isActive: true,
            validUntil: { $lt: new Date() }
        });
        
        return {
            totalPrescriptions: stats[0]?.totalPrescriptions || 0,
            totalMedications: stats[0]?.totalMedications || 0,
            totalTests: stats[0]?.totalTests || 0,
            followUpRequired: stats[0]?.followUpRequired || 0,
            activePrescriptions,
            expiredPrescriptions,
            period
        };
    } catch (error) {
        throw new Error(`Failed to get prescription stats: ${error.message}`);
    }
};

// Get prescriptions by date range
exports.getPrescriptionsByDateRange = async (doctorId, startDate, endDate) => {
    try {
        const prescriptions = await Prescription.findByDateRange(doctorId, startDate, endDate);
        return prescriptions;
    } catch (error) {
        throw new Error(`Failed to get prescriptions by date range: ${error.message}`);
    }
};

// Get expired prescriptions
exports.getExpiredPrescriptions = async () => {
    try {
        const expiredPrescriptions = await Prescription.findExpired()
            .populate('doctor', 'firstName lastName')
            .populate('user', 'firstName lastName email');
        
        return expiredPrescriptions;
    } catch (error) {
        throw new Error(`Failed to get expired prescriptions: ${error.message}`);
    }
};

// Search prescriptions
exports.searchPrescriptions = async (doctorId, searchTerm, filters = {}) => {
    try {
        const { page = 1, limit = 10 } = filters;
        
        const query = {
            doctor: doctorId,
            $or: [
                { diagnosis: { $regex: searchTerm, $options: 'i' } },
                { prescriptionNumber: { $regex: searchTerm, $options: 'i' } },
                { 'medications.name': { $regex: searchTerm, $options: 'i' } },
                { 'tests.name': { $regex: searchTerm, $options: 'i' } }
            ]
        };
        
        const prescriptions = await Prescription.find(query)
            .populate('appointment', 'appointmentDate startTime endTime reason')
            .populate('user', 'firstName lastName email phone')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        
        const total = await Prescription.countDocuments(query);
        
        return {
            prescriptions,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalCount: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        };
    } catch (error) {
        throw new Error(`Failed to search prescriptions: ${error.message}`);
    }
};
