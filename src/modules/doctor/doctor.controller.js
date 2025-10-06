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

// Verify OTP for doctor
exports.verifyOTP = async (req, res) => {
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
        const result = await doctorService.verifyOTP(normalizedPhone, otp);
        
        // Check if user should login instead of register
        if (result.data.isExistingUser) {
            return sendResponse({
                res,
                statusCode: 200,
                success: true,
                message: result.message,
                data: {
                    ...result.data,
                    redirectTo: 'login'
                }
            });
        }
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: result.message,
            data: {
                ...result.data,
                redirectTo: 'register'
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

// Register new doctor
exports.registerDoctor = async (req, res) => {
    try {
        const doctorData = req.body;
        
        // Validate required fields (only essential ones)
        const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'specialization', 'currentHospital', 'consultationFee'];
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
        
        const doctor = await doctorService.createDoctor(doctorData);
        
        sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Doctor registration successful. Please login to continue.',
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
        console.log(result);
        
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
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Profile retrieved successfully',
            data: doctor
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
        const doctor = await doctorService.updateDoctorProfile(req.doctor._id, updateData);
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Profile updated successfully',
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
        
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Document uploaded successfully',
            data: {
                documents: doctor.documents
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

// Update doctor profile
exports.updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, experience, bmdcNumber, qualification } = req.body;
        
        const updateData = {
            firstName,
            lastName,
            experience: parseInt(experience),
            bmdcNumber,
            qualification
        };

        const doctor = await doctorService.updateDoctorProfile(req.doctor._id, updateData);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Profile updated successfully',
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