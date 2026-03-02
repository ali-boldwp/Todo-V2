import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: Server;

export const initSocket = (server: any, allowedOrigins: string[]) => {
    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket: Socket) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.toString()?.replace('Bearer ', '');
        if (token) {
            try {
                const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                if (decoded?.userId) {
                    socket.join(`user:${decoded.userId}`);
                }
            } catch {
                // ignore invalid token for socket room join
            }
        }

        // Client joins a room for a specific project
        socket.on('join:project', (projectId: string) => {
            socket.join(`project:${projectId}`);
        });
        socket.on('leave:project', (projectId: string) => {
            socket.leave(`project:${projectId}`);
        });
        socket.on('join:conversation', (conversationId: string) => {
            socket.join(`conversation:${conversationId}`);
        });
        socket.on('leave:conversation', (conversationId: string) => {
            socket.leave(`conversation:${conversationId}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) throw new Error('Socket.IO not initialized');
    return io;
};

// ---- Emit helpers ----

/** Broadcast to all clients in a project room */
export const emitToProject = (projectId: string, event: string, payload?: any) => {
    getIO().to(`project:${projectId}`).emit(event, payload);
};

/** Broadcast to all connected clients */
export const emitToAll = (event: string, payload?: any) => {
    getIO().emit(event, payload);
};
