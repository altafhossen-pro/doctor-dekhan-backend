const express = require('express');
const router = express.Router();
const doctorController = require('./doctor.controller');

// Public routes
router.post('/signup', doctorController.signup);
router.post('/login', doctorController.login);

// Admin routes moved to separate admin/user module

module.exports = router;