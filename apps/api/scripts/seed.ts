import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Adjust paths to import models correctly from the scripts directory
// We might need to use ts-node to run this, so imports should work if tsconfig matches
import User from '../src/models/User';
import Organization from '../src/models/Organization';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://admin:password123@localhost:27017/devmanager?authSource=admin';
    console.log(`Connecting to MongoDB at ${mongoURI}...`);
    try {
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        process.exit(1);
    }
};

const seed = async () => {
    await connectDB();

    try {
        console.log('Clearing existing data...');
        await User.deleteMany({});
        await Organization.deleteMany({});

        console.log('Creating organization...');
        const org = await Organization.create({
            name: 'DevManager Default Org',
            plan: 'enterprise'
        });

        console.log('Created Organization:', org.name);

        const passwordHash = await bcrypt.hash('password123', 10);

        const users = [
            {
                email: 'admin@example.com',
                passwordHash,
                role: 'admin',
                firstName: 'Admin',
                lastName: 'User',
                organizationId: org._id
            },
            {
                email: 'manager@example.com',
                passwordHash,
                role: 'manager',
                firstName: 'Manager',
                lastName: 'User',
                organizationId: org._id
            },
            {
                email: 'member@example.com',
                passwordHash,
                role: 'member',
                firstName: 'Member',
                lastName: 'User',
                organizationId: org._id
            }
        ];

        console.log('Creating users...');
        await User.insertMany(users);

        console.log('Created Users:');
        users.forEach(u => console.log(`- ${u.email} (${u.role})`));

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
