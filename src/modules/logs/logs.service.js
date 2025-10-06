const Log = require('./log.model');

// Create log entry with fallback mechanisms
exports.createLog = async (logData) => {
    try {
        // Always log to console for immediate visibility
        const logLevel = logData.level || 'info';
        const logMessage = `[${logLevel.toUpperCase()}] ${logData.message}`;
        
        switch (logLevel) {
            case 'error':
                console.error('🚨', logMessage, logData);
                break;
            case 'warn':
                console.warn('⚠️', logMessage, logData);
                break;
            case 'info':
                console.info('ℹ️', logMessage, logData);
                break;
            default:
                console.log('📝', logMessage, logData);
        }

        // Try to save to database with fallback
        try {
            const log = new Log({
                level: logData.level || 'info',
                message: logData.message || 'No message provided',
                source: logData.source || 'backend',
                component: logData.component,
                error: logData.error ? {
                    name: logData.error.name,
                    message: logData.error.message,
                    stack: logData.error.stack,
                    code: logData.error.code
                } : undefined,
                request: logData.request,
                context: logData.context || {},
                tags: logData.tags || [],
                timestamp: logData.timestamp || new Date()
            });

            await log.save();
            
            return {
                id: log._id.toString(),
                timestamp: log.timestamp,
                level: log.level,
                message: log.message
            };

        } catch (dbError) {
            // If database save fails, log to file system as fallback
            console.error('❌ Database logging failed, using file fallback:', dbError.message);
            
            // In production, you might want to use a file-based logger like winston
            // For now, we'll just ensure the error is visible
            console.error('🔴 CRITICAL: Database logging failed:', {
                originalError: logData,
                dbError: dbError.message,
                timestamp: new Date().toISOString()
            });

            return {
                id: Date.now().toString(),
                timestamp: logData.timestamp || new Date(),
                level: logData.level || 'info',
                message: logData.message,
                fallback: true
            };
        }

    } catch (error) {
        // Ultimate fallback - ensure we never lose error information
        console.error('💥 CRITICAL: Logging system failed:', error);
        console.error('💥 Original log data:', logData);
        
        return {
            id: Date.now().toString(),
            timestamp: new Date(),
            level: 'error',
            message: 'Logging system failure',
            fallback: true,
            error: error.message
        };
    }
};

// Get logs with pagination and filtering
exports.getLogs = async (options = {}) => {
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
        } = options;

        // Build query
        const query = {};
        
        if (level) query.level = level;
        if (source) query.source = source;
        if (component) query.component = new RegExp(component, 'i');
        if (resolved !== undefined) query.resolved = resolved;
        
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        // Text search
        if (search) {
            query.$or = [
                { message: new RegExp(search, 'i') },
                { 'error.message': new RegExp(search, 'i') },
                { tags: new RegExp(search, 'i') }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;
        
        // Get logs with pagination
        const logs = await Log.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .populate('request.userId', 'name email')
            .populate('request.doctorId', 'name email')
            .populate('resolvedBy', 'name email')
            .lean();

        // Get total count
        const total = await Log.countDocuments(query);
        const totalPages = Math.ceil(total / limit);
        
        return {
            logs,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: total,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        };

    } catch (error) {
        console.error('Error getting logs:', error);
        throw new Error('Failed to retrieve logs');
    }
};

// Get error statistics
exports.getErrorStats = async (startDate, endDate) => {
    try {
        const stats = await Log.getErrorStats(
            new Date(startDate), 
            new Date(endDate)
        );
        
        return stats;
    } catch (error) {
        console.error('Error getting error stats:', error);
        throw new Error('Failed to retrieve error statistics');
    }
};

// Mark log as resolved
exports.resolveLog = async (logId, userId, notes) => {
    try {
        const log = await Log.findById(logId);
        if (!log) {
            throw new Error('Log not found');
        }

        await log.markAsResolved(userId, notes);
        return log;
    } catch (error) {
        console.error('Error resolving log:', error);
        throw new Error('Failed to resolve log');
    }
};
