import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Time from './pages/Time';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import GithubIntegration from './pages/GithubIntegration';
import Clients from './pages/Clients';
import Team from './pages/Team';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import { useState, useEffect } from 'react';

const Dashboard = () => {
    const { user } = useAuth();
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
            <p>Welcome, {user?.email}</p>
        </div>
    );
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    return <Layout>{children}</Layout>;
};

const AdminRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    if (!user) {
        return null;
    }
    if (user?.role !== 'admin') {
        return <Navigate to="/" />;
    }
    return <Layout>{children}</Layout>;
};

const AdminOrManagerRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    if (!user) {
        return null;
    }
    if (user?.role !== 'admin' && user?.role !== 'manager') {
        return <Navigate to="/" />;
    }
    return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/projects"
                element={
                    <ProtectedRoute>
                        <Projects />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/projects/:id/*"
                element={
                    <ProtectedRoute>
                        <ProjectDetails />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/clients"
                element={
                    <AdminOrManagerRoute>
                        <Clients />
                    </AdminOrManagerRoute>
                }
            />
            <Route
                path="/time"
                element={
                    <ProtectedRoute>
                        <Time />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/attendance"
                element={
                    <ProtectedRoute>
                        <Attendance />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/payroll"
                element={
                    <ProtectedRoute>
                        <Payroll />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/github"
                element={
                    <AdminRoute>
                        <GithubIntegration />
                    </AdminRoute>
                }
            />
            <Route
                path="/team"
                element={
                    <AdminRoute>
                        <Team />
                    </AdminRoute>
                }
            />
        </Routes>
    );
};

const App = () => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate a majestic initial app load to show off the fancy new loading screen 
        // and allow contexts/queries to initialize smoothly.
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
};

export default App;
