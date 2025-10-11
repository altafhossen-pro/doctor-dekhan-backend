const Doctor = require("../../doctor/doctor.model");

exports.approveDoctorProfile = async (doctorId) => {
    const doctor = await Doctor.findByIdAndUpdate(doctorId, {
        status: 'approved',
        approvedAt: new Date()
    });
    if (!doctor) {
        throw new Error('Doctor not found');
    }
    return doctor;
}

exports.getDoctorProfile = async (doctorId) => {
    try {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            throw new Error('Doctor not found');
        }
        return doctor;
    } catch (error) {

    }
}
