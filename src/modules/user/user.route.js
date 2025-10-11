const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { verifyToken } = require('../../middleware/verifyToken');

// Public routes (no authentication required)
router.post('/send-otp', userController.sendOTP);
router.post('/send-register-otp', userController.sendRegisterOTP);
router.post('/verify-otp', userController.verifyOTP);
router.post('/complete-registration', userController.completeRegistration);
router.post('/refresh-token', userController.refreshToken);

// Protected routes (authentication required)
router.get('/profile', verifyToken, userController.getUserProfile);
router.put('/profile', verifyToken, userController.updateUserProfile);
router.post('/logout', verifyToken, userController.logout);

module.exports = router;
