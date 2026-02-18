"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
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
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
app.use('/api', core_routes_1.default);
app.use('/api/tasks', task_routes_1.default);
app.use('/api/comments', comment_routes_1.default);
app.use('/api/planning', planning_routes_1.default);
app.use('/api/time', time_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/payroll', payroll_routes_1.default);
app.use('/api/github', github_routes_1.default);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
exports.default = app;
