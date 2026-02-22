import mongoose from 'mongoose';
import GithubConfig from './src/models/GithubConfig';
import dotenv from 'dotenv';
dotenv.config();

async function testSave() {
    await mongoose.connect('mongodb://mongo:ibbjba5pzkmn7hvu@185.185.80.245:27028/devmanager?authSource=admin');

    // Test 1: Can we just directly save a config?
    console.log('Test 1: Saving a test config...');
    try {
        const config = await GithubConfig.findOneAndUpdate(
            {},
            { personalAccessToken: 'test-token-12345', repoOwner: 'test-owner', repoName: 'test-repo' },
            { new: true, upsert: true }
        );
        console.log('✅ Config saved successfully:', JSON.stringify(config, null, 2));
    } catch (e: any) {
        console.error('❌ Config save FAILED:', e.message);
    }

    // Test 2: Read it back
    console.log('\nTest 2: Reading config...');
    const found = await GithubConfig.findOne();
    console.log('Found:', JSON.stringify(found, null, 2));

    // Test 3: Test GitHub OAuth exchange with current credentials
    console.log('\nTest 3: Verifying GitHub OAuth credentials by fetching auth URL...');
    const clientId = process.env.GITHUB_CLIENT_ID?.replace(/"/g, '');
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.replace(/"/g, '');
    console.log('Client ID (cleaned):', clientId);
    console.log('Client Secret length:', clientSecret?.length || 0);

    process.exit(0);
}

testSave().catch(e => { console.error(e); process.exit(1); });
