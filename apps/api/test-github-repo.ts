import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Project from './src/models/Project';
import GithubConfig from './src/models/GithubConfig';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URI!);

    // Check GitHub config exists
    const config = await GithubConfig.findOne();
    console.log('GitHub config:', config ? `✅ Token length: ${config.personalAccessToken?.length}` : '❌ NOT FOUND');

    if (!config?.personalAccessToken) {
        console.log('GitHub not connected - cannot test repo creation');
        return mongoose.disconnect();
    }

    // Get any existing project
    const project = await Project.findOne();
    if (!project) {
        console.log('No project found to test with');
        return mongoose.disconnect();
    }

    console.log('Testing GitHub repo creation for project:', project.name);

    const token = jwt.sign(
        { userId: project._id, role: 'admin' },
        process.env.JWT_SECRET || 'supersecretkey',
        { expiresIn: '1d' }
    );

    // Call the updateProject endpoint with createGithubRepo: true
    const res = await fetch(`http://localhost:3030/api/projects/${project._id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
            name: project.name,
            status: project.status,
            visibility: project.visibility,
            priority: project.priority,
            createGithubRepo: true
        })
    });

    const data = await res.json();
    console.log('\nUpdate response status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    mongoose.disconnect();
}

main().catch(console.error);
