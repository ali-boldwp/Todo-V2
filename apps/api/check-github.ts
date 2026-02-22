import mongoose from 'mongoose';
import GithubConfig from './src/models/GithubConfig';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI!).then(async () => {
    const c = await GithubConfig.findOne();
    if (c) {
        console.log('CONNECTED=YES');
        console.log('TOKEN_LENGTH=' + (c.personalAccessToken?.length || 0));
        console.log('TOKEN_PREFIX=' + c.personalAccessToken?.substring(0, 12));
    } else {
        console.log('CONNECTED=NO');
    }
    mongoose.disconnect();
});
