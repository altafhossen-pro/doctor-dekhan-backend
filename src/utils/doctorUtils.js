const Doctor = require('../modules/doctor/doctor.model');

/**
 * Generate a unique slug based on first name and last name
 * @param {string} firstName - Doctor's first name
 * @param {string} lastName - Doctor's last name
 * @param {string} doctorUID - Doctor's UID to use for duplicates
 * @returns {Promise<string>} - Unique slug
 */
const generateUniqueSlug = async (firstName, lastName, doctorUID) => {
    // Create base slug from first name and last name
    const baseSlug = `${firstName.toLowerCase().trim()}-${lastName.toLowerCase().trim()}`
        .replace(/[^a-z0-9-]/g, '') // Remove special characters except hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    let slug = baseSlug;

    // Check if slug exists
    const existingDoctor = await Doctor.findOne({ slug });
    if (!existingDoctor) {
        return slug;
    }

    // If slug exists, add doctorUID to make it unique
    slug = `${baseSlug}-${doctorUID}`;
    return slug;
};

/**
 * Generate a unique DoctorUID starting from 1101
 * @returns {Promise<string>} - Unique DoctorUID
 */
const generateUniqueDoctorUID = async () => {
    // Find the highest existing DoctorUID
    const lastDoctor = await Doctor.findOne({}, { doctorUID: 1 })
        .sort({ doctorUID: -1 })
        .limit(1);

    let nextUID;

    if (!lastDoctor || !lastDoctor.doctorUID) {
        // First doctor gets 1101
        nextUID = 1101;
    } else {
        // Increment the last UID
        const lastUID = parseInt(lastDoctor.doctorUID);
        nextUID = lastUID + 1;
    }

    // Ensure it's within 4-6 digits and starts with 11
    if (nextUID > 119999) {
        throw new Error('Maximum DoctorUID limit reached');
    }

    return nextUID.toString();
};

/**
 * Validate and generate both slug and doctorUID
 * @param {string} firstName - Doctor's first name
 * @param {string} lastName - Doctor's last name
 * @returns {Promise<{slug: string, doctorUID: string}>} - Object containing both unique identifiers
 */
const generateDoctorIdentifiers = async (firstName, lastName) => {
    if (!firstName || !lastName) {
        throw new Error('First name and last name are required to generate identifiers');
    }

    // Generate doctorUID first
    const doctorUID = await generateUniqueDoctorUID();
    
    // Then generate slug using the doctorUID
    const slug = await generateUniqueSlug(firstName, lastName, doctorUID);

    return { slug, doctorUID };
};

module.exports = {
    generateUniqueSlug,
    generateUniqueDoctorUID,
    generateDoctorIdentifiers
};
