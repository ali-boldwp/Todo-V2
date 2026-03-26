import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

export const logger = pino({
    transport: {
        target: 'pino-pretty',
    },
});

const app = express();

import authRoutes from './routes/auth.routes';
import coreRoutes from './routes/core.routes';
import taskRoutes from './routes/task.routes';
import commentRoutes from './routes/comment.routes';
import planningRoutes from './routes/planning.routes';
import timeRoutes from './routes/time.routes';
import attendanceRoutes from './routes/attendance.routes';
import payrollRoutes from './routes/payroll.routes';
import githubRoutes from './routes/github.routes';
import dockployRoutes from './routes/dockploy.routes';
import clientRoutes from './routes/client.routes';
import chatRoutes from './routes/chat.routes';
import notificationRoutes from './routes/notification.routes';
import ideRoutes from './routes/ide.routes';
import aiRoutes from './routes/ai.routes';

app.use(helmet());

export const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3030',
    'http://localhost:5173',
    'https://beta.devregion.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api', coreRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/time', timeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/dockploy', dockployRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ide', ideRoutes);
app.use('/api', aiRoutes);

const downloadsRoot = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(downloadsRoot)) {
    fs.mkdirSync(downloadsRoot, { recursive: true });
}
app.use('/downloads', express.static(downloadsRoot));

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '../../web/dist');
    app.use(express.static(buildPath));

    app.get('*', (_req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

export default app;
