import mongoose from 'mongoose';
import User from './src/models/User';
import Project from './src/models/Project';
import GithubConfig from './src/models/GithubConfig';
import jwt from 'jsonwebtoken';

async function test() {
    await mongoose.connect('mongodb://mongo:ibbjba5pzkmn7hvu@185.185.80.245:27028/devmanager?authSource=admin');
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
        console.log('No user found');
        return process.exit(0);
    }

    const token = jwt.sign(
        { userId: admin._id.toString(), role: admin.role, organizationId: admin.organizationId?.toString() },
        'supersecretkey',
        { expiresIn: '24h' }
    );

    try {
        const res = await fetch('http://localhost:3000/api/projects', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Direct API Test Repo ' + Date.now(),
                status: 'draft',
                priority: 'medium',
                visibility: 'private',
                createGithubRepo: true
            })
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
