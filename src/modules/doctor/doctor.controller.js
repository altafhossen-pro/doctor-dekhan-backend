const doctorService = require('./doctor.services');
const sendResponse = require('../../utils/sendResponse');
const { uploadDocument, handleUploadError, generateFileUrl } = require('../../utils/fileUpload');

// Normalize phone number
const normalizePhone = (phone) => {
    if (!phone) return phone;
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('880')) {
        cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('+880')) {
        cleaned = cleaned.substring(4);
    }
    
    // Ensure it starts with 01 and is 11 digits
    if (cleaned.startsWith('01') && cleaned.length === 11) {
        return cleaned;
    }
    
    return phone; // Return original if can't normalize
};

// Send OTP to doctor's phone (for registration)
exports.sendRegisterOTP = async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Phone number is required'
            });
        }

        const normalizedPhone = normalizePhone(phone);
        const result = await doctorService.sendRegisterOTP(normalizedPhone);
        
        // If doctor already exists, return 400 with specific message
        if (!result.success && result.data?.doctorExists) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: result.message,
                data: result.data
            });
        }

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Send OTP to doctor's phone (for login)
exports.sendLoginOTP = async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Phone number is required'
            });
        }

        const normalizedPhone = normalizePhone(phone);
        const result = await doctorService.sendLoginOTP(normalizedPhone);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Verify OTP for doctor registration
exports.verifyRegisterOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        
        if (!phone || !otp) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Phone number and OTP are required'
            });
        }

        const normalizedPhone = normalizePhone(phone);
        const result = await doctorService.verifyRegisterOTP(normalizedPhone, otp);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Verify OTP for doctor login
exports.verifyLoginOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        
        if (!phone || !otp) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Phone number and OTP are required'
            });
        }

        const normalizedPhone = normalizePhone(phone);
        const result = await doctorService.verifyLoginOTP(normalizedPhone, otp);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Register new doctor
exports.registerDoctor = async (req, res) => {
    try {
        const doctorData = req.body;
        
        // Validate required fields (only essential ones)
        const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'departments', 'currentHospital'];
        const missingFields = requiredFields.filter(field => !doctorData[field]);
        
        if (missingFields.length > 0) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Normalize phone
        doctorData.phone = normalizePhone(doctorData.phone);
        
        // Validate departments array
        if (!Array.isArray(doctorData.departments) || doctorData.departments.length === 0) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'At least one department is required'
            });
        }
        
        if (doctorData.departments.length > 3) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Maximum 3 departments allowed'
            });
        }
        
        const doctor = await doctorService.createDoctor(doctorData);
        
        // Generate tokens for auto-login
        const tokens = await doctorService.generateTokens(doctor._id);
        
        sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Doctor registration successful. You are now logged in.',
            data: {
                doctor: doctor.getPublicProfile(),
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Login doctor
exports.loginDoctor = async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Phone number is required'
            });
        }

        const normalizedPhone = normalizePhone(phone);
        const doctor = await doctorService.findDoctorByPhone(normalizedPhone);
        
        if (!doctor) {
            return sendResponse({
                res,
                statusCode: 404,
                success: false,
                message: 'Doctor not found. Please register first.'
            });
        }

        

        const result = await doctorService.loginDoctor(doctor);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Refresh access token
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Refresh token is required'
            });
        }

        const result = await doctorService.refreshAccessToken(refreshToken);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 401,
            success: false,
            message: error.message
        });
    }
};

// Get doctor profile
exports.getProfile = async (req, res) => {
    try {
        const doctor = req.doctor;
        
        // Mark doctor as online immediately when profile is accessed
        if (global.setDoctorOnline) {
            global.setDoctorOnline(doctor._id.toString(), 'profile-access');
        }
        
        // Check if doctor is ready for verification
        const isReadyForVerification = await doctorService.checkOrSetIsReadyForVerification(req.doctor._id);
        
        // Add isReadyForVerification property to doctor data
        const doctorData = {
            ...doctor.toObject(),
            isReadyForVerification
        };
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Profile retrieved successfully',
            data: doctorData
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Update doctor profile
exports.updateProfile = async (req, res) => {
    try {
        const updateData = req.body;
        
        // Validate departments if provided
        if (updateData.departments) {
            if (!Array.isArray(updateData.departments) || updateData.departments.length === 0) {
                return sendResponse({
                    res,
                    statusCode: 400,
                    success: false,
                    message: 'At least one department is required'
                });
            }
            
            if (updateData.departments.length > 3) {
                return sendResponse({
                    res,
                    statusCode: 400,
                    success: false,
                    message: 'Maximum 3 departments allowed'
                });
            }
        }
        
        const doctor = await doctorService.updateDoctorProfile(req.doctor._id, updateData);

        const isReadyForVerification = await doctorService.checkOrSetIsReadyForVerification(req.doctor._id);
        const updatedDoctor = await doctorService.getDoctorById(req.doctor._id);
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Profile updated successfully',
            data: {
                doctor: updatedDoctor.getPublicProfile(),
                isReadyForVerification
            }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Logout doctor
exports.logout = async (req, res) => {
    try {
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Upload document
exports.uploadDocument = async (req, res) => {
    try {
        const { type, url, originalName, fileSize, mimeType } = req.body;
        
        if (!type || !url || !originalName || !fileSize || !mimeType) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'All document fields are required'
            });
        }

        const documentData = {
            type,
            url,
            originalName,
            fileSize: parseInt(fileSize),
            mimeType
        };

        const doctor = await doctorService.uploadDocument(req.doctor._id, documentData);
        
        const isReadyForVerification = await doctorService.checkOrSetIsReadyForVerification(req.doctor._id);
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Document uploaded successfully',
            data: {
                documents: doctor.documents,
                isReadyForVerification: isReadyForVerification
            }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Get doctor documents
exports.getDocuments = async (req, res) => {
    try {
        const documents = await doctorService.getDoctorDocuments(req.doctor._id);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Documents retrieved successfully',
            data: {
                documents
            }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Upload file endpoint
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'No file uploaded'
            });
        }

        const fileUrl = generateFileUrl(req.file.filename, req.file.mimetype === 'application/pdf');
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'File uploaded successfully',
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                url: fileUrl,
                size: req.file.size,
                mimeType: req.file.mimetype
            }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Upload profile picture endpoint
exports.uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'No profile picture uploaded'
            });
        }

        // Validate file type for profile picture
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Only JPG, PNG, and WebP images are allowed for profile picture'
            });
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxSize) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Profile picture size must be less than 5MB'
            });
        }

        const fileUrl = generateFileUrl(req.file.filename, false);
        
        // Update doctor's profile picture URL
        const doctor = await doctorService.updateDoctorProfile(req.doctor._id, {
            profilePicture: fileUrl
        });
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Profile picture uploaded and saved successfully',
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                url: fileUrl,
                size: req.file.size,
                mimeType: req.file.mimetype,
                // doctor: doctor.getPublicProfile()
            }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Submit profile for admin approval
exports.submitForApproval = async (req, res) => {
    try {
        const doctor = req.doctor;
        
        const isReadyForVerification = await doctorService.checkOrSetIsReadyForVerification(req.doctor._id);

        if (isReadyForVerification === false) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Please complete your profile and upload all required documents first'
            });
        }

        // Check if already submitted
        if (doctor.isVerificationStatusSended === true) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Profile has already been submitted for approval'
            });
        }

        // Update doctor status
        const updatedDoctor = await doctorService.submitForApproval(req.doctor._id);
        

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Profile submitted for admin approval successfully',
            data: {
                doctor: updatedDoctor.getPublicProfile()
            }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Get online doctors status (for admin)
exports.getOnlineDoctors = async (req, res) => {
    try {
        const onlineDoctors = global.getActiveDoctors ? global.getActiveDoctors() : [];
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Online doctors retrieved successfully',
            data: {
                onlineDoctors,
                count: onlineDoctors.length
            }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Get doctor by slug (public)
exports.getDoctorBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const doctor = await doctorService.findDoctorBySlug(slug);
        
        if (!doctor) {
            return sendResponse({
                res,
                statusCode: 404,
                success: false,
                message: 'Doctor not found'
            });
        }
        
        // Format doctor data with proper department pricing
        const doctorData = doctor.getPublicProfile();
        
        // Map approvedDepartmentPricing with department names
        if (doctorData.approvedDepartmentPricing && doctorData.approvedDepartmentPricing.length > 0) {
            doctorData.approvedDepartmentPricing = doctorData.approvedDepartmentPricing.map(pricing => ({
                department: {
                    id: pricing.department,
                    name: doctor.departments.find(dept => dept._id.toString() === pricing.department.toString())?.name || 'Unknown Department'
                },
                fee: pricing.fee,
                approvedAt: pricing.approvedAt,
                approvedBy: pricing.approvedBy
            }));
        }
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Doctor retrieved successfully',
            data: {
                doctor: doctorData
            }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Get doctor by UID (public)
exports.getDoctorByUID = async (req, res) => {
    try {
        const { doctorUID } = req.params;
        const doctor = await doctorService.findDoctorByUID(doctorUID);
        
        if (!doctor) {
            return sendResponse({
                res,
                statusCode: 404,
                success: false,
                message: 'Doctor not found'
            });
        }
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Doctor retrieved successfully',
            data: {
                doctor: doctor.getPublicProfile()
            }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};

// Get doctors with pagination and filters (public)
exports.getDoctorsWithPagination = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '',
            department = '',
            experience = '',
            rating = '',
            priceRange = '',
            availability = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            search: search.trim(),
            department: department.trim(),
            experience: experience.trim(),
            rating: rating.trim(),
            priceRange: priceRange.trim(),
            availability: availability.trim(),
            sortBy,
            sortOrder
        };
        
        const result = await doctorService.getDoctorsWithPagination(options);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Doctors retrieved successfully',
            data: {
                doctors: result.doctors.map(doctor => {
                    // Since aggregation returns plain objects, we need to format manually
                    
                    return {
                        id: doctor._id,
                        firstName: doctor.firstName,
                        lastName: doctor.lastName,
                        slug: doctor.slug,
                        name: `${doctor.firstName} ${doctor.lastName}`,
                        departments: doctor.departments || [],
                        approvedDepartmentPricing: doctor.approvedDepartmentPricing && doctor.approvedDepartmentPricing.length > 0 ? doctor.approvedDepartmentPricing.map(pricing => ({
                            department: {
                                id: pricing.department,
                                name: (doctor.departments && doctor.departments.length > 0) 
                                    ? doctor.departments.find(dept => dept._id.toString() === pricing.department.toString())?.name || 'Unknown Department'
                                    : 'Unknown Department'
                            },
                            fee: pricing.fee,
                            approvedAt: pricing.approvedAt,
                            approvedBy: pricing.approvedBy
                        })) : [],
                        profilePicture: doctor.profilePicture,
                        pendingDepartmentPricing: doctor.pendingDepartmentPricing,
                        experience: doctor.experience,
                        qualification: doctor.qualification,
                        bmdcNumber: doctor.bmdcNumber,
                        currentHospital: doctor.currentHospital,
                        availableDays: doctor.availableDays,
                        rating: doctor.rating,
                        isAvailable: doctor.isAvailable,
                        status: doctor.status,
                        isCurrentlyHaveEditProfile: doctor.isCurrentlyHaveEditProfile,
                        isVerificationStatusSended: doctor.isVerificationStatusSended
                    };
                }),
                pagination: result.pagination
            }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 400,
            success: false,
            message: error.message
        });
    }
};