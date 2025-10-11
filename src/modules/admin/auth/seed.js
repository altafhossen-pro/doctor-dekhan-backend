const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./admin.model');

// Load environment variables
dotenv.config({ path: require('path').join(__dirname, '../../../../.env') });

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected for seeding...');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

// Create initial super admin
const createSuperAdmin = async () => {
    try {
        // Check if super admin already exists
        const existingSuperAdmin = await Admin.findOne({ role: 'super_admin' });

        if (existingSuperAdmin) {
            console.log('Super admin already exists');
            return;
        }

        const superAdminData = {
            firstName: 'Super',
            lastName: 'Admin',
            email: 'altafhossen.pro@gmail.com',
            phone: '01840209060',
            password: '12345678', // Change this in production
            role: 'super_admin',
            permissions: [
                'manage_doctors',
                'manage_users',
                'manage_appointments',
                'view_analytics',
                'manage_settings',
                'manage_admins',
                'view_logs'
            ],
            isActive: true
        };

        const superAdmin = new Admin(superAdminData);
        await superAdmin.save();

        console.log('Super admin created successfully:');
        console.log('Email:', superAdminData.email);
        console.log('Password:', superAdminData.password);
        console.log('Role:', superAdminData.role);

    } catch (error) {
        console.error('Error creating super admin:', error.message);
    }
};

// Create sample admin
const createSampleAdmin = async () => {
    try {
        // Check if sample admin already exists
        const existingAdmin = await Admin.findOne({ email: 'admin@doctorapp.com' });

        if (existingAdmin) {
            console.log('Sample admin already exists');
            return;
        }

        const adminData = {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@doctorapp.com',
            phone: '01700000001',
            password: 'admin123456', // Change this in production
            role: 'admin',
            permissions: [
                'manage_doctors',
                'manage_users',
                'manage_appointments',
                'view_analytics',
                'view_logs'
            ],
            isActive: true
        };

        const admin = new Admin(adminData);
        await admin.save();

        console.log('Sample admin created successfully:');
        console.log('Email:', adminData.email);
        console.log('Password:', adminData.password);
        console.log('Role:', adminData.role);

    } catch (error) {
        console.error('Error creating sample admin:', error.message);
    }
};

// Create sample moderator
const createSampleModerator = async () => {
    try {
        // Check if sample moderator already exists
        const existingModerator = await Admin.findOne({ email: 'moderator@doctorapp.com' });

        if (existingModerator) {
            console.log('Sample moderator already exists');
            return;
        }

        const moderatorData = {
            firstName: 'Moderator',
            lastName: 'User',
            email: 'moderator@doctorapp.com',
            phone: '01700000002',
            password: 'admin123456', // Change this in production
            role: 'moderator',
            permissions: [
                'manage_doctors',
                'view_analytics'
            ],
            isActive: true
        };

        const moderator = new Admin(moderatorData);
        await moderator.save();

        console.log('Sample moderator created successfully:');
        console.log('Email:', moderatorData.email);
        console.log('Password:', moderatorData.password);
        console.log('Role:', moderatorData.role);

    } catch (error) {
        console.error('Error creating sample moderator:', error.message);
    }
};

// Run all seed functions
const seedAdmins = async () => {
    try {
        console.log('Starting admin seed...');
        
        // Connect to database first
        await connectDB();

        await createSuperAdmin();
        await createSampleAdmin();
        await createSampleModerator();

        console.log('Admin seed completed!');
    } catch (error) {
        console.error('Seed process error:', error);
    } finally {
        // Close database connection
        mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    }
};

module.exports = {
    createSuperAdmin,
    createSampleAdmin,
    createSampleModerator,
    seedAdmins
};

// Run seed if this file is executed directly
if (require.main === module) {
    seedAdmins()
        .then(() => {
            console.log('Seed process completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seed process failed:', error);
            process.exit(1);
        });
}
