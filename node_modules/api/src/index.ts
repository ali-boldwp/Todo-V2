import dotenv from 'dotenv';
import app, { logger } from './app';
import { connectDB } from './config/db';

dotenv.config();

const PORT = process.env.PORT || 3001;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error(error, 'Failed to start server');
        process.exit(1);
    }
};

startServer();
