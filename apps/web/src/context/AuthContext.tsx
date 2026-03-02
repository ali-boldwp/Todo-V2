import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
    id: string;
    email: string;
    role: string;
    githubUsername?: string;
    githubSetupCompleted?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    setAuthFromToken: (token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const navigate = useNavigate();

    const hydrateUserFromToken = (rawToken: string) => {
        const decoded = parseJwt(rawToken);
        if (!decoded) return;
        setUser({
            id: decoded.userId,
            email: decoded.email || '',
            role: decoded.role,
            githubUsername: decoded.githubUsername,
            githubSetupCompleted: !!decoded.githubSetupCompleted,
        });
    };

    useEffect(() => {
        if (token && !user) {
            hydrateUserFromToken(token);
        }
    }, [token]);

    const login = (newToken: string, newUser: User) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser({
            ...newUser,
            githubSetupCompleted: newUser.githubSetupCompleted ?? false,
        });
        navigate('/');
    };

    const setAuthFromToken = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        hydrateUserFromToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, setAuthFromToken, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
