"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedOrigins = exports.logger = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_1 = __importDefault(require("pino"));
exports.logger = (0, pino_1.default)({
    transport: {
        target: 'pino-pretty',
    },
});
const app = (0, express_1.default)();
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const core_routes_1 = __importDefault(require("./routes/core.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const comment_routes_1 = __importDefault(require("./routes/comment.routes"));
const planning_routes_1 = __importDefault(require("./routes/planning.routes"));
const time_routes_1 = __importDefault(require("./routes/time.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const payroll_routes_1 = __importDefault(require("./routes/payroll.routes"));
const github_routes_1 = __importDefault(require("./routes/github.routes"));
const client_routes_1 = __importDefault(require("./routes/client.routes"));
app.use((0, helmet_1.default)());
exports.allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3030',
    'http://localhost:5173',
    'https://beta.devregion.com'
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (exports.allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use('/api/auth', auth_routes_1.default);
app.use('/api', core_routes_1.default);
app.use('/api/tasks', task_routes_1.default);
app.use('/api/comments', comment_routes_1.default);
app.use('/api/planning', planning_routes_1.default);
app.use('/api/time', time_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/payroll', payroll_routes_1.default);
app.use('/api/github', github_routes_1.default);
app.use('/api/clients', client_routes_1.default);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    const buildPath = path.join(__dirname, '../../web/dist');
    app.use(express_1.default.static(buildPath));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}
exports.default = app;
