import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'member' | 'client';
  profileImageUrl?: string;
  profileSetupCompleted: boolean;
  githubSetupCompleted: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Mock user - you can change this to test different roles
  const [user] = useState<User>({
    id: '1',
    email: 'admin@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'admin',
    profileSetupCompleted: true,
    githubSetupCompleted: true,
  });

  const [isAuthenticated] = useState(true);
  const [token] = useState('mock-token-123');

  const login = (email: string, password: string) => {
    console.log('Mock login:', email, password);
  };

  const logout = () => {
    console.log('Mock logout');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
