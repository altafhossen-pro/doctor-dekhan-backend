const OTP = require('../modules/otp/otp.model');

// Clean up expired and old OTPs (serverless-friendly)
exports.cleanupOTPs = async () => {
    try {
        const result = await OTP.cleanExpiredOTPs();
        console.log(`Cleaned up ${result.deletedCount} expired/old OTPs`);
        return result;
    } catch (error) {
        console.error('Error cleaning up OTPs:', error);
        throw error;
    }
};

// Clean up OTPs for specific phone number (lightweight)
exports.cleanupOTPsForPhone = async (phone) => {
    try {
        const result = await OTP.deleteMany({
            phone,
            type: 'phone_verification',
            $or: [
                { expiresAt: { $lt: new Date() } }, // Expired OTPs
                { isUsed: true, createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } } // Used OTPs older than 1 hour
            ]
        });
        return result;
    } catch (error) {
        console.error('Error cleaning up OTPs for phone:', error);
        throw error;
    }
};
