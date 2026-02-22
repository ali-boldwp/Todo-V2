import mongoose from 'mongoose';
import User from './src/models/User';
import jwt from 'jsonwebtoken';

async function test() {
    await mongoose.connect('mongodb://mongo:ibbjba5pzkmn7hvu@185.185.80.245:27028/devmanager?authSource=admin');
    const admin = await User.findOne();
    if (!admin) {
        console.log('No user found');
        return process.exit(0);
    }
    console.log('Found user:', admin.email, admin.organizationId);

    const token = jwt.sign(
        { userId: admin._id, role: admin.role, organizationId: admin.organizationId },
        'supersecretkey',
        { expiresIn: '24h' }
    );

    try {
        const res = await fetch('http://localhost:3000/api/github/config', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Body:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }

    process.exit(0);
}
test();
