const express = require('express');
const router = express.Router();
const logsController = require('./logs.controller');
const { verifyAdminToken } = require('../../middleware/verifyAdminToken');

// Create log entry (public - for frontend error reporting)
router.post('/', logsController.createLog);

// Admin routes (authentication required)
router.get('/', verifyAdminToken, logsController.getLogs);
router.get('/stats', verifyAdminToken, logsController.getErrorStats);
router.put('/:logId/resolve', verifyAdminToken, logsController.resolveLog);

module.exports = router;
