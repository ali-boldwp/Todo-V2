import mongoose from 'mongoose';
import GithubConfig from './src/models/GithubConfig';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URI!);
    const config = await GithubConfig.findOne();
    if (!config?.personalAccessToken) { console.log('No token'); return mongoose.disconnect(); }

    // List recent repos to see if test-project was created
    const res = await fetch('https://api.github.com/user/repos?sort=created&per_page=5', {
        headers: { Authorization: `Bearer ${config.personalAccessToken}`, Accept: 'application/vnd.github.v3+json' }
    });
    const repos = await res.json();
    console.log('Most recently created GitHub repos:');
    repos.forEach((r: any) => console.log(` - ${r.full_name} (created: ${r.created_at})`));
    mongoose.disconnect();
}
main().catch(console.error);
