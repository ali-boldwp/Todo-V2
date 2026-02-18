import mongoose from 'mongoose';
import { logger } from '../app';

export const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://admin:password123@localhost:27017/devmanager?authSource=admin';
    logger.info(`Connecting to MongoDB with URI: ${mongoURI.replace(/:([^:@]+)@/, ':****@')}`);
    try {
        await mongoose.connect(mongoURI, {
            authSource: 'admin',
            user: 'admin',
            pass: 'password123',
        });
        logger.info('MongoDB Connected');
    } catch (error) {
        logger.error(error, 'MongoDB Connection Error');
        process.exit(1);
    }
};
