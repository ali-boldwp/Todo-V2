"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToAll = exports.emitToProject = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let io;
const initSocket = (server, allowedOrigins) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });
    io.on('connection', (socket) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.toString()?.replace('Bearer ', '');
        if (token) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
                if (decoded?.userId) {
                    socket.join(`user:${decoded.userId}`);
                }
            }
            catch {
                // ignore invalid token for socket room join
            }
        }
        // Client joins a room for a specific project
        socket.on('join:project', (projectId) => {
            socket.join(`project:${projectId}`);
        });
        socket.on('leave:project', (projectId) => {
            socket.leave(`project:${projectId}`);
        });
        socket.on('join:conversation', (conversationId) => {
            socket.join(`conversation:${conversationId}`);
        });
        socket.on('leave:conversation', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io)
        throw new Error('Socket.IO not initialized');
    return io;
};
exports.getIO = getIO;
// ---- Emit helpers ----
/** Broadcast to all clients in a project room */
const emitToProject = (projectId, event, payload) => {
    (0, exports.getIO)().to(`project:${projectId}`).emit(event, payload);
};
exports.emitToProject = emitToProject;
/** Broadcast to all connected clients */
const emitToAll = (event, payload) => {
    (0, exports.getIO)().emit(event, payload);
};
exports.emitToAll = emitToAll;
