const express = require('express');
const router = express.Router();

const doctorRoutes = require('../modules/doctor/doctor.route');
const userRoutes = require('../modules/user/user.route');
const logsRoutes = require('../modules/logs/logs.route');
const adminDoctorRoutes = require('../modules/admin/doctor/admin.doctor.route');
const adminUserRoutes = require('../modules/admin/user/admin.user.route');
const adminAuthRoutes = require('../modules/admin/auth/admin.route');

router.use('/doctor', doctorRoutes);
router.use('/user', userRoutes);
router.use('/logs', logsRoutes);
router.use('/admin/doctor', adminDoctorRoutes);
router.use('/admin/user', adminUserRoutes);
router.use('/admin/auth', adminAuthRoutes);

// Health check route
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Doctor Backend API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

module.exports = router;
