"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToAll = exports.emitToUser = exports.emitToProject = exports.getOnlineUserIds = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let io;
const onlineUserConnections = new Map();
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
                    const userId = String(decoded.userId);
                    socket.data.userId = userId;
                    socket.join(`user:${userId}`);
                    const current = onlineUserConnections.get(userId) || 0;
                    onlineUserConnections.set(userId, current + 1);
                    if (current === 0) {
                        io.emit('presence:online', { userId });
                    }
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
        socket.on('typing:start', (conversationId) => {
            const userId = socket.data?.userId;
            if (!userId || !conversationId)
                return;
            socket.to(`conversation:${conversationId}`).emit('chat:typing', {
                conversationId,
                userId,
                isTyping: true,
            });
        });
        socket.on('typing:stop', (conversationId) => {
            const userId = socket.data?.userId;
            if (!userId || !conversationId)
                return;
            socket.to(`conversation:${conversationId}`).emit('chat:typing', {
                conversationId,
                userId,
                isTyping: false,
            });
        });
        socket.on('disconnect', () => {
            const userId = socket.data?.userId;
            if (!userId)
                return;
            const current = onlineUserConnections.get(userId) || 0;
            if (current <= 1) {
                onlineUserConnections.delete(userId);
                io.emit('presence:offline', { userId });
                return;
            }
            onlineUserConnections.set(userId, current - 1);
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
const getOnlineUserIds = () => Array.from(onlineUserConnections.keys());
exports.getOnlineUserIds = getOnlineUserIds;
// ---- Emit helpers ----
/** Broadcast to all clients in a project room */
const emitToProject = (projectId, event, payload) => {
    (0, exports.getIO)().to(`project:${projectId}`).emit(event, payload);
};
exports.emitToProject = emitToProject;
/** Emit to one authenticated user room */
const emitToUser = (userId, event, payload) => {
    (0, exports.getIO)().to(`user:${userId}`).emit(event, payload);
};
exports.emitToUser = emitToUser;
/** Broadcast to all connected clients */
const emitToAll = (event, payload) => {
    (0, exports.getIO)().emit(event, payload);
};
exports.emitToAll = emitToAll;
