const jwt = require('jsonwebtoken');
const User = require('../modules/user/user.model');
const sendResponse = require('../utils/sendResponse');
const Doctor = require('../modules/doctor/doctor.model');

exports.verifyDoctorToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return sendResponse({
                res,
                statusCode: 401,
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        // Find full user data from database
        const doctor = await Doctor.findById(decoded.doctorId);
       
        if (!doctor) {
            return sendResponse({
                res,
                statusCode: 401,
                success: false,
                message: 'Doctor not found.'
            });
        }

        if (!doctor.isActive) {
            return sendResponse({
                res,
                statusCode: 401,
                success: false,
                message: 'Account is deactivated.'
            });
        }

        
        // Put full user object in req.user
        req.doctor = doctor;
        next();
    } catch (error) {
        console.log(error,'altaf');
        return sendResponse({
            res,
            statusCode: 401,
            success: false,
            message: 'Invalid token.'
        });
    }
};
