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
        const { 
            page = 1, 
            limit = 50, 
            level, 
            source, 
            component,
            resolved,
            startDate,
            endDate,
            search
        } = req.query;
        
        const result = await logsService.getLogs({
            page: parseInt(page),
            limit: parseInt(limit),
            level,
            source,
            component,
            resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
            startDate,
            endDate,
            search
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

// Get error statistics
exports.getErrorStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return sendResponse({
                res,
                statusCode: 400,
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const stats = await logsService.getErrorStats(startDate, endDate);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Error statistics retrieved successfully',
            data: stats
        });

    } catch (error) {
        console.error('Get error stats error:', error);
        sendResponse({
            res,
            statusCode: 500,
            success: false,
            message: 'Failed to retrieve error statistics'
        });
    }
};

// Resolve log
exports.resolveLog = async (req, res) => {
    try {
        const { logId } = req.params;
        const { notes } = req.body;
        const userId = req.user?._id; // Assuming admin user from middleware

        const log = await logsService.resolveLog(logId, userId, notes);

        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Log resolved successfully',
            data: log
        });

    } catch (error) {
        console.error('Resolve log error:', error);
        sendResponse({
            res,
            statusCode: 500,
            success: false,
            message: error.message || 'Failed to resolve log'
        });
    }
};
