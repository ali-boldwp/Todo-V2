import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import User from '../src/models/User';
import Organization from '../src/models/Organization';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://admin:password123@localhost:27017/devmanager?authSource=admin';
    console.log(`Connecting to MongoDB...`);
    try {
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        process.exit(1);
    }
};

const ensureAdmin = async () => {
    await connectDB();

    try {
        const adminEmail = 'ali@boldwp.com';

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log(`Admin user ${adminEmail} already exists. Skipping creation.`);
            process.exit(0);
        }

        console.log(`Admin user ${adminEmail} not found. Creating...`);

        // Find or create default organization
        let org = await Organization.findOne({ name: 'BoldWP' }); // Custom org name for this user
        if (!org) {
            // Fallback to finding ANY organization if specific one doesn't exist, to avoid error? 
            // Better to just create one if we are seeding entirely.
            // But if there are other orgs, maybe we should create a new one for this admin?
            // Let's create a dedicated one.
            console.log('Organization "BoldWP" not found. Creating...');
            org = await Organization.create({
                name: 'BoldWP',
                plan: 'enterprise'
            });
            console.log('Created Organization:', org.name);
        } else {
            console.log('Found Organization:', org.name);
        }

        const passwordHash = await bcrypt.hash('password123', 10);

        const newAdmin = await User.create({
            email: adminEmail,
            passwordHash,
            role: 'admin',
            firstName: 'Ali',
            lastName: 'Admin',
            organizationId: org._id
        });

        console.log(`Successfully created admin user: ${newAdmin.email}`);
        process.exit(0);
    } catch (error) {
        console.error('Failed to create admin user:', error);
        process.exit(1);
    }
};

ensureAdmin();
