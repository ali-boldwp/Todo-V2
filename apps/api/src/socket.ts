import { Server, Socket } from 'socket.io';

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
        // Client joins a room for a specific project
        socket.on('join:project', (projectId: string) => {
            socket.join(`project:${projectId}`);
        });
        socket.on('leave:project', (projectId: string) => {
            socket.leave(`project:${projectId}`);
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
