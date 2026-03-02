import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import app, { logger, allowedOrigins } from './app';
import { connectDB } from './config/db';
import { initSocket } from './socket';

// Prefer API-local .env in monorepo workspace runs, then fall back to repo root .env.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = process.env.PORT || 3001;

const startServer = async () => {
    try {
        await connectDB();
        const httpServer = http.createServer(app);
        initSocket(httpServer, allowedOrigins);
        httpServer.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error(error, 'Failed to start server');
        process.exit(1);
    }
};

startServer();
