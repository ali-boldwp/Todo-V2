import mongoose from 'mongoose';
import GithubConfig from './src/models/GithubConfig';
import User from './src/models/User';

async function test() {
    await mongoose.connect('mongodb://mongo:ibbjba5pzkmn7hvu@185.185.80.245:27028/devmanager?authSource=admin');

    // Get admin first to get their organization ID
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
        console.log('No user found');
        process.exit(0);
    }

    const config = await GithubConfig.findOne({ organizationId: admin.organizationId });
    if (!config) {
        console.log('No GitHub Config found in DB');
        process.exit(0);
    }

    console.log('Using Token:', config.personalAccessToken);

    const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.personalAccessToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: 'auto-creation-test-' + Date.now(),
            private: true
        })
    });

    console.log('Status:', response.status);
    console.log('Body:', await response.text());
    process.exit(0);
}
test();
