const express = require('express');
const router = express.Router();
const timeSlotController = require('./timeslot.controller');
const { verifyDoctorToken } = require('../../middleware/verifyDoctorToken');

// Public route for getting available slots (for appointment booking)
router.get('/public/available/:doctorId', timeSlotController.getPublicAvailableSlots);

// Public route for getting available slots for a date range
router.get('/public/available-range/:doctorId', timeSlotController.getPublicAvailableSlotsRange);

// All other routes require doctor authentication
router.use(verifyDoctorToken);

// Create or update time slot
router.post('/', timeSlotController.createOrUpdateTimeSlot);

// Get all time slots for a doctor
router.get('/', timeSlotController.getDoctorTimeSlots);

// Get time slots for a specific day
router.get('/day/:dayOfWeek', timeSlotController.getTimeSlotsByDay);

// Get available slots for a specific date
router.get('/available', timeSlotController.getAvailableSlots);

// Get time slot statistics
router.get('/stats', timeSlotController.getTimeSlotStats);

// Toggle time slot status
router.patch('/:timeSlotId/toggle', timeSlotController.toggleTimeSlotStatus);

// Delete time slot
router.delete('/:timeSlotId', timeSlotController.deleteTimeSlot);

module.exports = router;
