const express = require('express');
const router = express.Router();
const logsController = require('./logs.controller');

// Create log entry
router.post('/', logsController.createLog);

// Get logs (for admin dashboard)
router.get('/', logsController.getLogs);

module.exports = router;
