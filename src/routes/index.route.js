const express = require('express');
const router = express.Router();

const doctorRoutes = require('../modules/doctor/doctor.route');

router.use('/doctor', doctorRoutes);

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
