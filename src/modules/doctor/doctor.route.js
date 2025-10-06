const express = require('express');
const router = express.Router();
const doctorController = require('./doctor.controller');
const { verifyDoctorToken } = require('../../middleware/verifyDoctorToken');
const { uploadDocument, handleUploadError } = require('../../utils/fileUpload');

// Public routes (no authentication required)
router.post('/send-register-otp', doctorController.sendRegisterOTP);
router.post('/send-login-otp', doctorController.sendLoginOTP);
router.post('/verify-otp', doctorController.verifyOTP);
router.post('/register', doctorController.registerDoctor);
router.post('/login', doctorController.loginDoctor);
router.post('/refresh-token', doctorController.refreshToken);

// Protected routes (authentication required)
router.get('/profile', verifyDoctorToken, doctorController.getProfile);
router.put('/profile', verifyDoctorToken, doctorController.updateProfile);
router.post('/logout', verifyDoctorToken, doctorController.logout);

// Document routes
router.post('/upload-file', verifyDoctorToken, uploadDocument, handleUploadError, doctorController.uploadFile);
router.post('/upload-document', verifyDoctorToken, doctorController.uploadDocument);
router.get('/documents', verifyDoctorToken, doctorController.getDocuments);

module.exports = router;