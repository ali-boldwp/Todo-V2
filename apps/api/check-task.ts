import mongoose from 'mongoose';
import Task from './src/models/Task';
import dotenv from 'dotenv';
import path from 'path';

// Ensure we load the .env from the current directory (apps/api)
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkTask() {
    console.log('Connecting to:', process.env.MONGO_URI);
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected to DB');

        const tasks = await Task.find({ title: /Fix all landmarks/i });
        console.log(`Found ${tasks.length} tasks matching criteria`);

        for (const task of tasks) {
            console.log('---');
            console.log('ID:', task._id);
            console.log('Title:', task.title);
            console.log('Description type:', typeof task.description);
            console.log('Description:', JSON.stringify(task.description, null, 2));
        }
    } catch (err) {
        console.error('Error during checkTask:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from DB');
    }
}

checkTask().catch(console.error);
