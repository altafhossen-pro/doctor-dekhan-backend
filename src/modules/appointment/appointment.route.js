const express = require('express');
const router = express.Router();
const appointmentController = require('./appointment.controller');
const { verifyToken } = require('../../middleware/verifyToken');
const { verifyDoctorToken } = require('../../middleware/verifyDoctorToken');

// Public routes (no authentication required)
router.get('/available/:doctorId', appointmentController.getAvailableSlots);

// User routes (require user authentication)
router.use(verifyToken);

// Create appointment (user)
router.post('/', appointmentController.createAppointment);

// Get user appointments
router.get('/user', appointmentController.getUserAppointments);

// Get single appointment
router.get('/:appointmentId', appointmentController.getAppointmentById);

// Cancel appointment (user or doctor)
router.patch('/:appointmentId/cancel', appointmentController.cancelAppointment);

// Reschedule appointment (user or doctor)
router.patch('/:appointmentId/reschedule', appointmentController.rescheduleAppointment);

// Doctor routes (require doctor authentication)
router.use(verifyDoctorToken);

// Get doctor appointments
router.get('/doctor/all', appointmentController.getDoctorAppointments);

// Update appointment status (doctor only)
router.patch('/:appointmentId/status', appointmentController.updateAppointmentStatus);

// Get appointment statistics (doctor only)
router.get('/doctor/stats', appointmentController.getAppointmentStats);

module.exports = router;
