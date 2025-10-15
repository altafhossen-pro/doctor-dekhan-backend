const Doctor = require('./doctor.model');
const OTP = require('../otp/otp.model');
const User = require('../user/user.model');
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTP, sendOTPInternal, verifyOTP } = require('../user/user.services');
const { generateDoctorIdentifiers } = require('../../utils/doctorUtils');

// Generate access token for doctor
exports.generateAccessToken = (doctorId) => {
    return jwt.sign(
        { doctorId, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' } // 30 days access token
    );
};

// Generate refresh token for doctor
exports.generateRefreshToken = (doctorId) => {
    return jwt.sign(
        { doctorId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '90d' } // 3 months refresh token
    );
};

// Generate both tokens
exports.generateTokens = (doctorId) => {
    return {
        accessToken: exports.generateAccessToken(doctorId),
        refreshToken: exports.generateRefreshToken(doctorId)
    };
};

// Verify access token
exports.verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid access token');
    }
};

// Verify refresh token
exports.verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
};

// Send OTP to doctor's phone (for registration)
exports.sendRegisterOTP = async (phone) => {
    try {
        // For registration: Check if phone is already used by a regular user
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            throw new Error('This phone number is already registered as a user. Please use a different phone number for doctor registration.');
        }

        // Check if doctor already exists
        const existingDoctor = await Doctor.findOne({ phone });
        if (existingDoctor) {
            return {
                success: false,
                message: 'This phone number is already registered as a doctor. Please login instead of registering.',
                data: {
                    doctorExists: true,
                    redirectTo: 'login'
                }
            };
        }

        // Use the internal OTP service (without cross-role validation)
        return await sendOTPInternal(phone);
    } catch (error) {
        throw error;
    }
};

// Send OTP to doctor's phone (for login)
exports.sendLoginOTP = async (phone) => {
    try {
        // First check if phone is registered as a regular user
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            throw new Error('This phone number is already registered as a user. Please use a different phone number for doctor login.');
        }

        // Then check if doctor exists
        const doctor = await Doctor.findOne({ phone });
        if (!doctor) {
            throw new Error('No doctor found with this phone number. Please register first.');
        }

        // Allow login for all active doctors (pending, approved, etc.)
        if (!doctor.isActive) {
            throw new Error('Your account is deactivated. Please contact support.');
        }

        // Use the internal OTP service (without cross-role validation)
        return await sendOTPInternal(phone);
    } catch (error) {
        throw error;
    }
};

// Verify OTP for doctor registration
exports.verifyRegisterOTP = async (phone, otp) => {
    try {
        // Verify the OTP
        const otpResult = await verifyOTP(phone, otp);

        // OTP verified successfully - proceed with registration
        return {
            success: true,
            message: 'OTP verified successfully. You can now proceed with registration.',
            data: {
                isExistingUser: false,
                shouldLogin: false,
                redirectTo: 'register',
                message: 'OTP verified. You can proceed with registration.'
            }
        };
    } catch (error) {
        throw error;
    }
};

// Verify OTP for doctor login
exports.verifyLoginOTP = async (phone, otp) => {
    try {
        // First check if doctor exists
        const doctor = await Doctor.findOne({ phone });
        if (!doctor) {
            throw new Error('No doctor found with this phone number. Please register first.');
        }

        // Check if doctor is active
        if (!doctor.isActive) {
            throw new Error('Your account is deactivated. Please contact support.');
        }

        // Verify the OTP
        const otpResult = await verifyOTP(phone, otp);

        // Generate tokens for login
        const tokens = exports.generateTokens(doctor._id);

        // Update last login
        await Doctor.findByIdAndUpdate(doctor._id, { lastLoginAt: new Date() });

        return {
            success: true,
            message: 'OTP verified successfully. Login successful.',
            data: {
                doctor: doctor.getPublicProfile(),
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                redirectTo: 'dashboard'
            }
        };
    } catch (error) {
        throw error;
    }
};

// Create new doctor
exports.createDoctor = async (doctorData) => {
    try {
        // Check if doctor already exists
        const existingDoctor = await Doctor.findOne({
            $or: [
                { email: doctorData.email },
                { phone: doctorData.phone },
                ...(doctorData.bmdcNumber && doctorData.bmdcNumber.trim() !== '' ? [{ bmdcNumber: doctorData.bmdcNumber }] : [])
            ]
        });

        if (existingDoctor) {
            const conflictField = existingDoctor.email === doctorData.email ? 'email' :
                existingDoctor.phone === doctorData.phone ? 'phone' : 'BMDC number';
            throw new Error(`Doctor with this ${conflictField} already exists`);
        }

        // Generate unique identifiers
        const { slug, doctorUID } = await generateDoctorIdentifiers(
            doctorData.firstName, 
            doctorData.lastName
        );

        // Create new doctor with only provided fields
        const doctor = new Doctor({
            firstName: doctorData.firstName,
            lastName: doctorData.lastName,
            email: doctorData.email,
            phone: doctorData.phone,
            slug: slug,
            doctorUID: doctorUID,
            departments: doctorData.departments,
            currentHospital: doctorData.currentHospital,
            consultationFee: doctorData.consultationFee,
            // Optional fields - only include if provided and not empty
            ...(doctorData.experience && doctorData.experience !== '' && { experience: doctorData.experience }),
            ...(doctorData.qualification && doctorData.qualification.trim() !== '' && { qualification: doctorData.qualification }),
            ...(doctorData.bmdcNumber && doctorData.bmdcNumber.trim() !== '' && { bmdcNumber: doctorData.bmdcNumber }),
            status: 'pending',
            isActive: true,
            isAvailable: false
        });

        await doctor.save();
        return doctor;
    } catch (error) {
        throw error;
    }
};

// Find doctor by phone
exports.findDoctorByPhone = async (phone) => {
    try {
        return await Doctor.findOne({ phone, isActive: true });
    } catch (error) {
        throw error;
    }
};

// Find doctor by slug
exports.findDoctorBySlug = async (slug) => {
    try {
        return await Doctor.findOne({ slug, isActive: true });
    } catch (error) {
        throw error;
    }
};

// Find doctor by doctorUID
exports.findDoctorByUID = async (doctorUID) => {
    try {
        return await Doctor.findOne({ doctorUID, isActive: true });
    } catch (error) {
        throw error;
    }
};

// Find doctor by email
exports.findDoctorByEmail = async (email) => {
    try {
        return await Doctor.findOne({ email, isActive: true });
    } catch (error) {
        throw error;
    }
};

// Login doctor
exports.loginDoctor = async (doctor) => {
    try {
        const tokens = exports.generateTokens(doctor._id);

        // Update last login
        doctor.lastLoginAt = new Date();
        await doctor.findByIdAndUpdate(doctor._id, { lastLoginAt: new Date() });

        return {
            success: true,
            message: 'Login successful',
            data: {
                doctor: doctor.getPublicProfile(),
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            }
        };
    } catch (error) {
        throw error;
    }
};

// Refresh access token
exports.refreshAccessToken = async (refreshToken) => {
    try {
        const decoded = exports.verifyRefreshToken(refreshToken);
        const doctor = await Doctor.findById(decoded.doctorId);

        if (!doctor || !doctor.isActive) {
            throw new Error('Doctor not found or inactive');
        }

        const newAccessToken = exports.generateAccessToken(doctor._id);

        return {
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken: newAccessToken,
                doctor: doctor.getPublicProfile()
            }
        };
    } catch (error) {
        throw error;
    }
};

// Get doctor profile
exports.getDoctorProfile = async (doctorId) => {
    try {
        const doctor = await Doctor.findById(doctorId).populate('departments', 'name slug description icon color');
        if (!doctor) {
            throw new Error('Doctor not found');
        }
        return doctor;
    } catch (error) {
        throw error;
    }
};

// Update doctor profile
exports.updateDoctorProfile = async (doctorId, updateData) => {
    try {
        const updatedDoctor = await Doctor.findByIdAndUpdate(
            doctorId,
            updateData,
            { new: true, runValidators: true }
        );
        if (!updatedDoctor) {
            throw new Error('Doctor not found');
        }
        return updatedDoctor;
    } catch (error) {
        throw error;
    }
};


// Get all doctors (for admin)
exports.getAllDoctors = async (filters = {}) => {
    try {
        const query = { isActive: true };

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.department) {
            query.department = filters.department;
        }

        const doctors = await Doctor.find(query)
            .populate('departments', 'name slug description icon color')
            .select('-__v')
            .sort({ createdAt: -1 });

        return doctors;
    } catch (error) {
        throw error;
    }
};

// Approve doctor (admin only)
exports.approveDoctor = async (doctorId, adminId) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            {
                status: 'approved',
                verifiedBy: adminId,
                verifiedAt: new Date(),
                isAvailable: true
            },
            { new: true }
        );

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw error;
    }
};

// Reject doctor (admin only)
exports.rejectDoctor = async (doctorId, adminId, reason) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            {
                status: 'rejected',
                verifiedBy: adminId,
                verifiedAt: new Date(),
                verificationNotes: reason
            },
            { new: true }
        );

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw error;
    }
};

// Deactivate doctor
exports.deactivateDoctor = async (doctorId) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { isActive: false, isAvailable: false },
            { new: true }
        );

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw error;
    }
};

// Upload document for doctor
exports.uploadDocument = async (doctorId, documentData) => {
    try {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        // Check if document type already exists
        const existingDoc = doctor.documents.find(doc => doc.type === documentData.type);

        // For degree certificates, always add new (multiple allowed)
        // For other documents, update existing or add new
        if (documentData.type === 'mbbs_degree') {
            // Always add new degree certificate
            doctor.documents.push({
                type: documentData.type,
                url: documentData.url,
                originalName: documentData.originalName,
                fileSize: documentData.fileSize,
                mimeType: documentData.mimeType,
                uploadedAt: new Date(),
                verified: false,
                rejected: false
            });
        } else if (existingDoc) {
            // Update existing document (for BMDC, NID, etc.)
            existingDoc.url = documentData.url;
            existingDoc.originalName = documentData.originalName;
            existingDoc.fileSize = documentData.fileSize;
            existingDoc.mimeType = documentData.mimeType;
            existingDoc.uploadedAt = new Date();
            existingDoc.verified = false;
            existingDoc.rejected = false;
        } else {
            // Add new document
            doctor.documents.push({
                type: documentData.type,
                url: documentData.url,
                originalName: documentData.originalName,
                fileSize: documentData.fileSize,
                mimeType: documentData.mimeType,
                uploadedAt: new Date(),
                verified: false,
                rejected: false
            });
        }

        await doctor.save();

        // Check if all required documents are now uploaded
        const requiredDocuments = ['bmdc_certificate', 'mbbs_degree', 'nid_front', 'nid_back'];
        const uploadedDocuments = doctor.documents.map(doc => doc.type);

        // For degree certificates, check if at least one exists
        const hasBMDC = uploadedDocuments.includes('bmdc_certificate');
        const hasDegree = uploadedDocuments.includes('mbbs_degree');
        const hasNIDFront = uploadedDocuments.includes('nid_front');
        const hasNIDBack = uploadedDocuments.includes('nid_back');

        const hasAllDocuments = hasBMDC && hasDegree && hasNIDFront && hasNIDBack;

        // Check if all required profile fields are filled
        const hasFirstName = doctor.firstName && doctor.firstName.trim() !== '';
        const hasLastName = doctor.lastName && doctor.lastName.trim() !== '';
        const hasBMDCNumber = doctor.bmdcNumber && doctor.bmdcNumber.trim() !== '';
        const hasExperience = doctor.experience !== null && doctor.experience !== undefined && doctor.experience !== '';
        const hasQualification = doctor.qualification && doctor.qualification.trim() !== '';

        const hasAllProfileFields = hasFirstName && hasLastName && hasBMDCNumber && hasExperience && hasQualification;


        // Update isReadyForVerification status - both documents AND profile fields must be complete
        if (hasAllDocuments && hasAllProfileFields && !doctor.isReadyForVerification) {
            doctor.isReadyForVerification = true;
            await doctor.save();
        }

        return doctor;
    } catch (error) {
        throw error;
    }
};

// Get doctor documents
exports.getDoctorDocuments = async (doctorId) => {
    try {
        const doctor = await Doctor.findById(doctorId).select('documents');
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor.documents;
    } catch (error) {
        throw error;
    }
};

// Verify document (admin only)
exports.verifyDocument = async (doctorId, documentId, adminId, verified, notes) => {
    try {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        const document = doctor.documents.id(documentId);
        if (!document) {
            throw new Error('Document not found');
        }

        document.verified = verified;
        document.verifiedBy = adminId;
        document.verifiedAt = new Date();
        document.verificationNotes = notes;
        document.rejected = !verified;

        if (!verified) {
            document.rejectionReason = notes;
        }

        await doctor.save();
        return doctor;
    } catch (error) {
        throw error;
    }
};

// Update doctor profile
exports.updateDoctorProfile = async (doctorId, updateData) => {
    try {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        // Check if doctor can edit profile (not submitted for approval)
        if (doctor.isVerificationStatusSended === true) {
            throw new Error('Cannot update profile after submission for approval');
        }

        // Handle department pricing separately to ensure proper validation
        if (updateData.departmentPricing) {
            // Check if doctor can edit pricing
            if (!doctor.canEditPricingNow()) {
                throw new Error('Pricing editing is currently disabled. Contact support to enable pricing updates.');
            }

            // Validate department pricing
            if (!Array.isArray(updateData.departmentPricing)) {
                throw new Error('Department pricing must be an array');
            }

            // Validate each pricing entry
            for (const pricing of updateData.departmentPricing) {
                if (!pricing.department || !pricing.fee) {
                    throw new Error('Each department pricing must have department and fee');
                }
                if (typeof pricing.fee !== 'number' || pricing.fee < 0) {
                    throw new Error('Department fee must be a non-negative number');
                }
            }

            // Move current approved pricing to pending if there are changes
            const newPendingPricing = [];
            
            for (const newPricing of updateData.departmentPricing) {
                const currentApproved = doctor.approvedDepartmentPricing.find(p => 
                    p.department.toString() === newPricing.department.toString()
                );
                
                if (currentApproved && currentApproved.fee !== newPricing.fee) {
                    // Fee has changed, add to pending
                    newPendingPricing.push({
                        department: newPricing.department,
                        fee: newPricing.fee,
                        previousFee: currentApproved.fee,
                        submittedAt: new Date()
                    });
                } else if (!currentApproved) {
                    // New department pricing
                    newPendingPricing.push({
                        department: newPricing.department,
                        fee: newPricing.fee,
                        previousFee: 0,
                        submittedAt: new Date()
                    });
                }
            }

            // Update pending pricing
            doctor.pendingDepartmentPricing = newPendingPricing;

            // Remove departmentPricing from updateData to avoid duplicate update
            delete updateData.departmentPricing;
        }

        // Update other fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                doctor[key] = updateData[key];
            }
        });

        await doctor.save();

        return doctor;
    } catch (error) {
        throw error;
    }
};

// Approve doctor (admin only)
exports.approveDoctor = async (doctorId, adminId) => {
    try {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        // Update doctor status
        doctor.status = 'approved';
        doctor.approvedAt = new Date();
        doctor.verifiedAt = new Date();
        doctor.verifiedBy = adminId;

        // Move pending pricing to approved pricing
        if (doctor.pendingDepartmentPricing && doctor.pendingDepartmentPricing.length > 0) {
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
        }

        await doctor.save();

        return doctor;
    } catch (error) {
        throw error;
    }
};

// Reject doctor (admin only)
exports.rejectDoctor = async (doctorId, adminId, rejectionReason) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            {
                status: 'rejected',
                verifiedBy: adminId,
                verifiedAt: new Date(),
                verificationNotes: rejectionReason
            },
            { new: true, runValidators: true }
        );

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw error;
    }
};

// Submit doctor profile for admin approval
exports.submitForApproval = async (doctorId) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            {
                isCurrentlyHaveEditProfile: false,
                isVerificationStatusSended: true,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw error;
    }
};


exports.checkOrSetIsReadyForVerification = async (doctorId) => {
    try {
        const doctor = await Doctor.findById(doctorId);

        const requiredDocuments = ['bmdc_certificate', 'mbbs_degree', 'nid_front', 'nid_back'];
        const uploadedDocuments = doctor.documents.map(doc => doc.type);

        const hasAllDocuments = requiredDocuments.every(doc => uploadedDocuments.includes(doc));

        const hasFirstName = doctor.firstName && doctor.firstName.trim() !== '';
        const hasLastName = doctor.lastName && doctor.lastName.trim() !== '';
        const hasBMDCNumber = doctor.bmdcNumber && doctor.bmdcNumber.trim() !== '';
        const hasExperience = doctor.experience !== null && doctor.experience !== undefined && doctor.experience !== '';
        const hasQualification = doctor.qualification && doctor.qualification.trim() !== '';

        const hasAllProfileFields = hasFirstName && hasLastName && hasBMDCNumber && hasExperience && hasQualification;

        const isReadyForVerification = hasAllDocuments && hasAllProfileFields && !doctor.isReadyForVerification;

        return isReadyForVerification ? true : false;
    } catch (error) {
        throw error;
    }
};

exports.getDoctorById = async (doctorId) => {
    try {
        const doctor = await Doctor.findById(doctorId).populate('departments', 'name slug description icon color');
        return doctor;
    } catch (error) {
        throw error;
    }
};

// Get all doctors for admin with pagination and filters
exports.getAllDoctorsForAdmin = async (options) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = 'all',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;

        // Build query
        let query = {};

        // Status filter
        if (status !== 'all') {
            query.status = status;
        }

        // Search filter
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { 'department.name': { $regex: search, $options: 'i' } },
                { bmdcNumber: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query
        const [doctors, totalCount] = await Promise.all([
            Doctor.find(query)
                .populate('departments', 'name slug description icon color')
                .select('-password -refreshToken')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Doctor.countDocuments(query)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            doctors,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCount,
                limit: parseInt(limit),
                hasNextPage,
                hasPrevPage
            }
        };
    } catch (error) {
        throw error;
    }
};

// Update doctor status
exports.updateDoctorStatus = async (doctorId, updateData) => {
    try {
        const { status, rejectionReason, updatedBy } = updateData;
        
        const updateFields = {
            status,
            updatedBy
        };

        if (rejectionReason) {
            updateFields.rejectionReason = rejectionReason;
        }

        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            updateFields,
            { new: true, runValidators: true }
        ).select('-password -refreshToken');

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw error;
    }
};

// Delete doctor
exports.deleteDoctor = async (doctorId) => {
    try {
        const doctor = await Doctor.findByIdAndDelete(doctorId).select('-password -refreshToken');
        
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw error;
    }
};

// Get doctor statistics
exports.getDoctorStats = async () => {
    try {
        const [
            totalDoctors,
            approvedDoctors,
            pendingDoctors,
            rejectedDoctors,
            activeDoctors
        ] = await Promise.all([
            Doctor.countDocuments(),
            Doctor.countDocuments({ status: 'approved' }),
            Doctor.countDocuments({ status: 'pending' }),
            Doctor.countDocuments({ status: 'rejected' }),
            Doctor.countDocuments({ isAvailable: true })
        ]);

        return {
            total: totalDoctors,
            approved: approvedDoctors,
            pending: pendingDoctors,
            rejected: rejectedDoctors,
            active: activeDoctors
        };
    } catch (error) {
        throw error;
    }
};

// Get department pricing for a specific department
exports.getDepartmentPricing = async (doctorId, departmentId) => {
    try {
        const doctor = await Doctor.findById(doctorId).populate('approvedDepartmentPricing.department pendingDepartmentPricing.department');
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        const approvedPricing = doctor.approvedDepartmentPricing.find(p => 
            p.department._id.toString() === departmentId.toString()
        );

        const pendingPricing = doctor.pendingDepartmentPricing.find(p => 
            p.department._id.toString() === departmentId.toString()
        );

        return {
            approved: approvedPricing,
            pending: pendingPricing
        };
    } catch (error) {
        throw error;
    }
};

// Enable/disable pricing editing for doctor (admin only)
exports.togglePricingEdit = async (doctorId, canEdit, adminId) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { 
                canEditPricing: canEdit,
                updatedBy: adminId
            },
            { new: true, runValidators: true }
        );

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor;
    } catch (error) {
        throw error;
    }
};

// Approve pending pricing updates (admin only)
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

        return doctor;
    } catch (error) {
        throw error;
    }
};

// Reject pending pricing updates (admin only)
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

        return doctor;
    } catch (error) {
        throw error;
    }
};
