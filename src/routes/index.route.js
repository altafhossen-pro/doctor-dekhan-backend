const express = require('express');
const router = express.Router();

const doctorRoutes = require('../modules/doctor/doctor.route');
const userRoutes = require('../modules/user/user.route');
const logsRoutes = require('../modules/logs/logs.route');

router.use('/doctor', doctorRoutes);
router.use('/user', userRoutes);
router.use('/logs', logsRoutes);

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
