import { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface SocketContextValue {
    joinProject: (projectId: string) => void;
    leaveProject: (projectId: string) => void;
}

const SocketContext = createContext<SocketContextValue>({
    joinProject: () => { },
    leaveProject: () => { },
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const queryClient = useQueryClient();
    const socketRef = useRef<Socket | null>(null);

    const getCurrentUserRole = () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload?.role || null;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        const socket = io(API_URL, { withCredentials: true });
        socketRef.current = socket;

        // Task events — invalidate tasks for the relevant project
        socket.on('task:created', (task: any) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', task.projectId] });
        });

        socket.on('task:updated', (task: any) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', task.projectId] });
            // Also invalidate individual task if it's cached
            queryClient.invalidateQueries({ queryKey: ['task', task._id] });
        });

        socket.on('task:deleted', (task: any) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', task.projectId] });
        });

        // Project events — invalidate the projects list
        socket.on('project:updated', () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        });

        socket.on('notification:created', (notification: any) => {
            const role = getCurrentUserRole();
            if (!role) return;
            const recipients = notification?.recipientRoles;
            if (Array.isArray(recipients) && recipients.length > 0 && !recipients.includes(role)) return;
            if (notification?.message) alert(notification.message);
        });

        return () => {
            socket.disconnect();
        };
    }, [queryClient]);

    const joinProject = (projectId: string) => {
        socketRef.current?.emit('join:project', projectId);
    };

    const leaveProject = (projectId: string) => {
        socketRef.current?.emit('leave:project', projectId);
    };

    return (
        <SocketContext.Provider value={{ joinProject, leaveProject }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
