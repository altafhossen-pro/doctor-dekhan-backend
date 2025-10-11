const Doctor = require('./doctor.model');
const OTP = require('../otp/otp.model');
const User = require('../user/user.model');
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTP, sendOTPInternal, verifyOTP } = require('../user/user.services');

// Generate access token for doctor
exports.generateAccessToken = (doctorId) => {
    return jwt.sign(
        { doctorId, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

// Generate refresh token for doctor
exports.generateRefreshToken = (doctorId) => {
    return jwt.sign(
        { doctorId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
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
            throw new Error('This phone number is already registered. Please try again with another number.');
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

// Verify OTP for doctor
exports.verifyOTP = async (phone, otp) => {
    try {
        // First verify the OTP
        const otpResult = await verifyOTP(phone, otp);

        // After OTP verification, check if doctor already exists
        const existingDoctor = await Doctor.findOne({ phone });

        if (existingDoctor) {
            // If doctor exists, generate tokens and return login data
            const tokens = exports.generateTokens(existingDoctor._id);

            // Update last login
            await Doctor.findByIdAndUpdate(existingDoctor._id, { lastLoginAt: new Date() });

            return {
                success: true,
                message: 'OTP verified successfully. Login successful.',
                data: {
                    isExistingUser: true,
                    shouldLogin: true,
                    redirectTo: 'login',
                    doctor: existingDoctor,
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken
                }
            };
        }

        // If doctor doesn't exist, return success for registration
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

// Create new doctor
exports.createDoctor = async (doctorData) => {
    try {
        // Check if doctor already exists
        const existingDoctor = await Doctor.findOne({
            $or: [
                { email: doctorData.email },
                { phone: doctorData.phone },
                ...(doctorData.bmdcNumber ? [{ bmdcNumber: doctorData.bmdcNumber }] : [])
            ]
        });

        if (existingDoctor) {
            const conflictField = existingDoctor.email === doctorData.email ? 'email' :
                existingDoctor.phone === doctorData.phone ? 'phone' : 'BMDC number';
            throw new Error(`Doctor with this ${conflictField} already exists`);
        }

        // Phone validation is already done at OTP sending stage

        // Create new doctor with only provided fields
        const doctor = new Doctor({
            firstName: doctorData.firstName,
            lastName: doctorData.lastName,
            email: doctorData.email,
            phone: doctorData.phone,
            specialization: doctorData.specialization,
            currentHospital: doctorData.currentHospital,
            consultationFee: doctorData.consultationFee,
            // Optional fields - only include if provided
            ...(doctorData.experience && { experience: doctorData.experience }),
            ...(doctorData.qualification && { qualification: doctorData.qualification }),
            ...(doctorData.bmdcNumber && { bmdcNumber: doctorData.bmdcNumber }),
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
        const doctor = await Doctor.findById(doctorId);
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
        console.log("❌ Error in updateDoctorProfile:", error.message);
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

        if (filters.specialization) {
            query.specialization = new RegExp(filters.specialization, 'i');
        }

        const doctors = await Doctor.find(query)
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
        console.log('🔍 Uploading document for doctor:', doctorId, documentData);

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        console.log('👨‍⚕️ Doctor found:', doctor.firstName, doctor.lastName);
        console.log('📄 Current documents:', doctor.documents.length);

        // Check if document type already exists
        const existingDoc = doctor.documents.find(doc => doc.type === documentData.type);

        // For degree certificates, always add new (multiple allowed)
        // For other documents, update existing or add new
        if (documentData.type === 'mbbs_degree') {
            console.log('➕ Adding new degree certificate (multiple allowed):', documentData.type);
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
            console.log('🔄 Updating existing document:', existingDoc.type);
            // Update existing document (for BMDC, NID, etc.)
            existingDoc.url = documentData.url;
            existingDoc.originalName = documentData.originalName;
            existingDoc.fileSize = documentData.fileSize;
            existingDoc.mimeType = documentData.mimeType;
            existingDoc.uploadedAt = new Date();
            existingDoc.verified = false;
            existingDoc.rejected = false;
        } else {
            console.log('➕ Adding new document:', documentData.type);
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

        console.log('💾 Saving doctor with documents:', doctor.documents.length);
        await doctor.save();
        console.log('✅ Doctor saved successfully');

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

        console.log('🔍 Document and Profile check (upload):', {
            requiredDocuments,
            uploadedDocuments,
            hasBMDC,
            hasDegree,
            hasNIDFront,
            hasNIDBack,
            hasAllDocuments,
            hasFirstName,
            hasLastName,
            hasBMDCNumber,
            hasExperience,
            hasQualification,
            hasAllProfileFields,
            isReadyForVerification: doctor.isReadyForVerification
        });

        // Update isReadyForVerification status - both documents AND profile fields must be complete
        if (hasAllDocuments && hasAllProfileFields && !doctor.isReadyForVerification) {
            doctor.isReadyForVerification = true;
            await doctor.save();
            console.log('✅ Doctor is now ready for verification:', doctor.firstName, doctor.lastName);
        }

        return doctor;
    } catch (error) {
        console.error('❌ Error uploading document:', error);
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
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            updateData,
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

// Approve doctor (admin only)
exports.approveDoctor = async (doctorId) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            {
                status: 'approved',
                approvedAt: new Date(),
                verifiedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        console.log('✅ Doctor approved:', doctor.firstName, doctor.lastName, 'at', doctor.approvedAt);
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

        console.log('❌ Doctor rejected:', doctor.firstName, doctor.lastName, 'Reason:', rejectionReason);
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
        const doctor = await Doctor.findById(doctorId);
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
                { specialization: { $regex: search, $options: 'i' } },
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
