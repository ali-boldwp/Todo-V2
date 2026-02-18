import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Time from './pages/Time';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import GithubIntegration from './pages/GithubIntegration';
import Clients from './pages/Clients';
import Layout from './components/Layout';

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

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
                    <ProtectedRoute>
                        <Clients />
                    </ProtectedRoute>
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
                    <ProtectedRoute>
                        <GithubIntegration />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
};

export default App;
