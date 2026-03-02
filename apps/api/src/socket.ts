import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: Server;
const onlineUserConnections = new Map<string, number>();

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
                    const userId = String(decoded.userId);
                    socket.data.userId = userId;
                    socket.join(`user:${userId}`);
                    const current = onlineUserConnections.get(userId) || 0;
                    onlineUserConnections.set(userId, current + 1);
                    if (current === 0) {
                        io.emit('presence:online', { userId });
                    }
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
        socket.on('typing:start', (conversationId: string) => {
            const userId = socket.data?.userId;
            if (!userId || !conversationId) return;
            socket.to(`conversation:${conversationId}`).emit('chat:typing', {
                conversationId,
                userId,
                isTyping: true,
            });
        });
        socket.on('typing:stop', (conversationId: string) => {
            const userId = socket.data?.userId;
            if (!userId || !conversationId) return;
            socket.to(`conversation:${conversationId}`).emit('chat:typing', {
                conversationId,
                userId,
                isTyping: false,
            });
        });
        socket.on('disconnect', () => {
            const userId = socket.data?.userId;
            if (!userId) return;
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

export const getIO = () => {
    if (!io) throw new Error('Socket.IO not initialized');
    return io;
};

export const getOnlineUserIds = () => Array.from(onlineUserConnections.keys());

// ---- Emit helpers ----

/** Broadcast to all clients in a project room */
export const emitToProject = (projectId: string, event: string, payload?: any) => {
    getIO().to(`project:${projectId}`).emit(event, payload);
};

/** Broadcast to all connected clients */
export const emitToAll = (event: string, payload?: any) => {
    getIO().emit(event, payload);
};
