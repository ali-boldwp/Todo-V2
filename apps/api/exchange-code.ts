import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import GithubConfig from './src/models/GithubConfig';
import dotenv from 'dotenv';
dotenv.config();

// Use the live code directly
const LIVE_CODE = '467216c34040da0bcc94';

async function main() {
    await mongoose.connect(process.env.MONGO_URI!);

    const clientId = process.env.GITHUB_CLIENT_ID?.replace(/"/g, '');
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.replace(/"/g, '');

    console.log('Exchanging code:', LIVE_CODE);
    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code: LIVE_CODE }),
    });

    const data = await response.json();
    console.log('GitHub response:', JSON.stringify(data));

    if (data.access_token) {
        console.log('✅ Got access token! Saving to DB...');
        const config = await GithubConfig.findOneAndUpdate(
            {},
            { personalAccessToken: data.access_token },
            { new: true, upsert: true }
        );
        console.log('✅ Saved! Config ID:', config._id);
        console.log('Token length:', config.personalAccessToken?.length);
    } else {
        console.log('❌ Failed to get token:', data.error, data.error_description);
    }

    mongoose.disconnect();
}

main().catch(console.error);
