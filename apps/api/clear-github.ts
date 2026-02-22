import mongoose from 'mongoose';
import GithubConfig from './src/models/GithubConfig';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI!).then(async () => {
    await GithubConfig.deleteMany({});
    console.log('Cleared all stale GithubConfig docs');
    const remaining = await GithubConfig.countDocuments();
    console.log('Remaining docs:', remaining);
    mongoose.disconnect();
});
