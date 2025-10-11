const express = require('express');
const router = express.Router();
const doctorController = require('./doctor.controller');
const { verifyDoctorToken } = require('../../middleware/verifyDoctorToken');
const { uploadDocument, handleUploadError } = require('../../utils/fileUpload');

// Public routes (no authentication required)
router.post('/send-register-otp', doctorController.sendRegisterOTP);
router.post('/send-login-otp', doctorController.sendLoginOTP);
router.post('/verify-register-otp', doctorController.verifyRegisterOTP);
router.post('/verify-login-otp', doctorController.verifyLoginOTP);
router.post('/register', doctorController.registerDoctor);
router.post('/login', doctorController.loginDoctor);
router.post('/refresh-token', doctorController.refreshToken);

// Protected routes (authentication required)
router.get('/profile', verifyDoctorToken, doctorController.getProfile);
router.patch('/profile', verifyDoctorToken, doctorController.updateProfile);
router.post('/submit-for-approval', verifyDoctorToken, doctorController.submitForApproval);
router.post('/logout', verifyDoctorToken, doctorController.logout);

// Admin routes for online doctors
router.get('/online', doctorController.getOnlineDoctors);
// Public routes for finding doctors

router.get('/slug/:slug', doctorController.getDoctorBySlug);
router.get('/uid/:doctorUID', doctorController.getDoctorByUID);

// Document routes

router.post('/upload-file', verifyDoctorToken, uploadDocument, handleUploadError, doctorController.uploadFile);
router.post('/upload-document', verifyDoctorToken, doctorController.uploadDocument);
router.get('/documents', verifyDoctorToken, doctorController.getDocuments);

module.exports = router;