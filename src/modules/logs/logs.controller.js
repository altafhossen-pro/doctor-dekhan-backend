const logsService = require('./logs.service');
const sendResponse = require('../../utils/sendResponse');

// Create log entry
exports.createLog = async (req, res) => {
    try {
        const logData = req.body;
        
        // Add server context
        const enrichedLogData = {
            ...logData,
            serverTimestamp: new Date().toISOString(),
            serverIP: req.ip,
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer')
        };

        const result = await logsService.createLog(enrichedLogData);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Log created successfully',
            data: result
        });

    } catch (error) {
        console.error('Create log error:', error);
        sendResponse({
            res,
            statusCode: 500,
            success: false,
            message: 'Failed to create log'
        });
    }
};

// Get logs (for admin dashboard)
exports.getLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, type, severity } = req.query;
        
        const result = await logsService.getLogs({
            page: parseInt(page),
            limit: parseInt(limit),
            type,
            severity
        });

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Logs retrieved successfully',
            data: result.logs,
            pagination: result.pagination
        });

    } catch (error) {
        console.error('Get logs error:', error);
        sendResponse({
            res,
            statusCode: 500,
            success: false,
            message: 'Failed to retrieve logs'
        });
    }
};
