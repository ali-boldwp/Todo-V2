"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToAll = exports.emitToProject = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
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
        // Client joins a room for a specific project
        socket.on('join:project', (projectId) => {
            socket.join(`project:${projectId}`);
        });
        socket.on('leave:project', (projectId) => {
            socket.leave(`project:${projectId}`);
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
