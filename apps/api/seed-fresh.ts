import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

// Import all models so their collections get dropped
import User from './src/models/User';
import Project from './src/models/Project';
import Task from './src/models/Task';
import Sprint from './src/models/Sprint';
import Epic from './src/models/Epic';
import Comment from './src/models/Comment';
import Client from './src/models/Client';
import TimeEntry from './src/models/TimeEntry';
import { SalaryStructure, Payslip } from './src/models/Payroll';
import Attendance from './src/models/Attendance';
import GithubConfig from './src/models/GithubConfig';

async function seed() {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected to DB');

    // Drop all collections
    await Promise.all([
        User.deleteMany({}),
        Project.deleteMany({}),
        Task.deleteMany({}),
        Sprint.deleteMany({}),
        Epic.deleteMany({}),
        Comment.deleteMany({}),
        Client.deleteMany({}),
        TimeEntry.deleteMany({}),
        SalaryStructure.deleteMany({}),
        Payslip.deleteMany({}),
        Attendance.deleteMany({}),
        GithubConfig.deleteMany({}),
    ]);
    console.log('✅ All collections cleared');

    // Create fresh admin user
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    const admin = await User.create({
        email: 'admin@boldwp.com',
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
    });

    console.log('✅ Admin user created:');
    console.log('   Email:    admin@boldwp.com');
    console.log('   Password: admin123');
    console.log('   ID:      ', admin._id.toString());

    mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
