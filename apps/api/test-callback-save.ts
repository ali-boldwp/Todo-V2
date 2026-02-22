import mongoose from 'mongoose';
import GithubConfig from './src/models/GithubConfig';
import dotenv from 'dotenv';
dotenv.config();

// Simulate exactly what handleGithubCallback does
mongoose.connect(process.env.MONGO_URI!).then(async () => {
    console.log('Testing save with only personalAccessToken (no repoOwner/repoName)...');
    try {
        const config = await GithubConfig.findOneAndUpdate(
            {},
            { personalAccessToken: 'gho_SIMULATED_REAL_TOKEN' },
            { new: true, upsert: true }
        );
        console.log('✅ SUCCESS - Config saved:', JSON.stringify(config, null, 2));
    } catch (e: any) {
        console.error('❌ FAILED:', e.message);
        if (e.errors) {
            Object.keys(e.errors).forEach(k => console.error('  Field error:', k, '-', e.errors[k].message));
        }
    }
    mongoose.disconnect();
});
