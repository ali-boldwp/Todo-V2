import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import Login from './pages/Login';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Time from './pages/Time';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import GithubIntegration from './pages/GithubIntegration';
import DockployIntegration from './pages/DockployIntegration';
import Clients from './pages/Clients';
import Team from './pages/Team';
import GithubMemberSetup from './pages/GithubMemberSetup';
import Chat from './pages/Chat';
import ProfileSetup from './pages/ProfileSetup';
import Verifications from './pages/Verifications';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import CreateTaskDrawer from './components/CreateTaskDrawer';
import { useState, useEffect } from 'react';
import { getProjects } from './services/core';
import { getTasks } from './services/task';
import { getTeamMembers } from './services/team';
import { getClients } from './services/client';
import { useSocket } from './context/SocketContext';

const requiresProfileSetup = (user: any) =>
    !!user && !user.profileSetupCompleted;

const requiresGithubSetup = (user: any) =>
    !!user && ['manager', 'member'].includes(user.role) && !user.githubSetupCompleted;

const formatDuration = (seconds: number) => {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

const isValidIdeRedirectUrl = (redirectUri: string | null): boolean => {
    if (!redirectUri) return false;
    try {
        const url = new URL(redirectUri);
        const isHttp = url.protocol === 'http:';
        const isLocalhost = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
        return isHttp && isLocalhost;
    } catch {
        return false;
    }
};

const IdeAuthCallbackBridge = ({ token, redirectUri, state }: { token: string; redirectUri: string; state: string | null }) => {
    useEffect(() => {
        try {
            const callbackUrl = new URL(redirectUri);
            callbackUrl.searchParams.set('token', token);
            if (state) callbackUrl.searchParams.set('state', state);
            window.location.replace(callbackUrl.toString());
        } catch {
            // Ignore and fall back to normal app rendering.
        }
    }, [token, redirectUri, state]);

    return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-gray-900">Finishing IDE login...</h2>
                <p className="text-sm text-gray-600 mt-2">Redirecting back to WebStorm callback.</p>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const { joinProject, leaveProject } = useSocket();
    const [clockTick, setClockTick] = useState(0);
    const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    const isAdmin = user?.role === 'admin';
    const isClient = user?.role === 'client';
    const canSeeClarificationTasks = isAdmin || isClient;
    const { data: projects = [] } = useQuery({
        queryKey: ['dashboard-projects'],
        queryFn: getProjects,
        enabled: canSeeClarificationTasks,
    });
    const { data: tasks = [] } = useQuery({
        queryKey: ['dashboard-tasks'],
        queryFn: () => getTasks(''),
        enabled: canSeeClarificationTasks,
    });
    const { data: teamMembers = [] } = useQuery({
        queryKey: ['dashboard-team-members'],
        queryFn: getTeamMembers,
        enabled: isAdmin,
    });
    const { data: clients = [] } = useQuery({
        queryKey: ['dashboard-clients'],
        queryFn: getClients,
        enabled: isAdmin,
    });

    useEffect(() => {
        if (!isAdmin) return;
        const intervalId = setInterval(() => {
            setClockTick((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(intervalId);
    }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin) return;
        const ids = projects
            .map((project: any) => project?._id)
            .filter(Boolean);

        ids.forEach((id: string) => joinProject(id));
        return () => {
            ids.forEach((id: string) => leaveProject(id));
        };
    }, [isAdmin, projects, joinProject, leaveProject]);

    if (isAdmin) {
        const totalProjects = projects.length;
        const activeProjects = projects.filter((p: any) => p.status === 'active').length;
        const completedProjects = projects.filter((p: any) => p.status === 'completed').length;
        const archivedProjects = projects.filter((p: any) => p.status === 'archived').length;

        const totalTasks = tasks.length;
        const taskTodo = tasks.filter((t: any) => t.status === 'todo').length;
        const taskInProgress = tasks.filter((t: any) => t.status === 'in_progress').length;
        const taskReview = tasks.filter((t: any) => t.status === 'review').length;
        const taskUnderVerification = tasks.filter((t: any) => t.status === 'under_verification').length;
        const taskDone = tasks.filter((t: any) => t.status === 'done').length;
        const completionRate = totalTasks > 0 ? Math.round((taskDone / totalTasks) * 100) : 0;

        const totalTeamUsers = teamMembers.length;
        const activeTeamUsers = teamMembers.filter((m: any) => m.isActive).length;
        const managers = teamMembers.filter((m: any) => m.role === 'manager').length;
        const members = teamMembers.filter((m: any) => m.role === 'member').length;
        const verifiersEnabled = teamMembers.filter((m: any) => m.canVerifyTasks).length;

        const totalClients = clients.length;
        const activeClients = clients.filter((c: any) => c.status === 'active').length;
        const suspendedClients = clients.filter((c: any) => c.status === 'suspended').length;
        const projectNameById = new Map(
            projects.map((project: any) => [project._id?.toString?.() || project._id, project.name || 'Untitled Project'])
        );
        const liveWorkItems = tasks
            .filter((task: any) => task.status === 'in_progress' && task.activeWorkerId)
            .map((task: any) => {
                const projectId = task?.projectId?._id?.toString?.() || task?.projectId?.toString?.() || '';
                const worker = task.activeWorkerId;
                const workerName = [worker?.firstName, worker?.lastName].filter(Boolean).join(' ').trim() || worker?.email || 'Unknown';
                const running = !task.isWorkPaused;
                const lastStart = task.lastWorkStartedAt ? new Date(task.lastWorkStartedAt) : null;
                const sessionSeconds = running && lastStart && !Number.isNaN(lastStart.getTime())
                    ? Math.max(0, Math.floor((Date.now() - lastStart.getTime()) / 1000))
                    : 0;
                return {
                    id: task._id,
                    title: task.title || 'Untitled task',
                    workerName,
                    projectName: projectNameById.get(projectId) || 'Unknown Project',
                    running,
                    sessionSeconds,
                    totalWorkedSeconds: Number(task.totalWorkedSecondsComputed || task.totalWorkedSeconds || 0),
                };
            });
        const clarificationRequiredTasks = tasks.filter(
            (task: any) => task.status === 'clarification' || task.needsClarification === true
        );
        void clockTick;

        return (
            <div className="p-6 bg-gradient-to-b from-slate-50 to-white min-h-full space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Full application stats overview</p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-amber-700">Clarification Required Tasks</h2>
                    {clarificationRequiredTasks.length === 0 ? (
                        <p className="text-sm text-slate-500 mt-3">No tasks currently require clarification.</p>
                    ) : (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {clarificationRequiredTasks.map((task: any) => {
                                const projectId = task?.projectId?._id?.toString?.() || task?.projectId?.toString?.() || '';
                                const projectName = projectNameById.get(projectId) || 'Unknown Project';
                                return (
                                    <div key={`clarification-${task._id}`} className="rounded-lg border border-amber-200 bg-white p-3">
                                        <p className="text-sm font-semibold text-slate-900">{String(task.title || 'Untitled task')}</p>
                                        <p className="text-xs text-slate-600 mt-1">Project: {String(projectName)}</p>
                                        <p className="text-xs text-amber-700 mt-1">Status: Clarification needed</p>
                                        <div className="mt-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedTask(task);
                                                    setIsTaskDrawerOpen(true);
                                                }}
                                                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded hover:bg-indigo-100"
                                            >
                                                Preview
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase text-slate-500 font-semibold">Total Projects</p>
                        <p className="text-2xl font-bold text-slate-900 mt-2">{totalProjects}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-white p-4">
                        <p className="text-xs uppercase text-slate-500 font-semibold">Active Projects</p>
                        <p className="text-2xl font-bold text-emerald-700 mt-2">{activeProjects}</p>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-white p-4">
                        <p className="text-xs uppercase text-slate-500 font-semibold">Completed Projects</p>
                        <p className="text-2xl font-bold text-blue-700 mt-2">{completedProjects}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase text-slate-500 font-semibold">Archived Projects</p>
                        <p className="text-2xl font-bold text-slate-700 mt-2">{archivedProjects}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Task Stats</h2>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-xs text-slate-500">Total</p>
                                <p className="text-xl font-bold text-slate-900">{totalTasks}</p>
                            </div>
                            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                                <p className="text-xs text-emerald-700">Done</p>
                                <p className="text-xl font-bold text-emerald-700">{taskDone}</p>
                            </div>
                            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                                <p className="text-xs text-amber-700">In Progress</p>
                                <p className="text-xl font-bold text-amber-700">{taskInProgress}</p>
                            </div>
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                                <p className="text-xs text-blue-700">Under Verification</p>
                                <p className="text-xl font-bold text-blue-700">{taskUnderVerification}</p>
                            </div>
                            <div className="rounded-lg border border-violet-100 bg-violet-50 p-3">
                                <p className="text-xs text-violet-700">Review</p>
                                <p className="text-xl font-bold text-violet-700">{taskReview}</p>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-xs text-slate-500">To Do</p>
                                <p className="text-xl font-bold text-slate-900">{taskTodo}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">Completion rate: {completionRate}%</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">People Stats</h2>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-xs text-slate-500">Team Users</p>
                                <p className="text-xl font-bold text-slate-900">{totalTeamUsers}</p>
                            </div>
                            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                                <p className="text-xs text-emerald-700">Active Team</p>
                                <p className="text-xl font-bold text-emerald-700">{activeTeamUsers}</p>
                            </div>
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                                <p className="text-xs text-blue-700">Managers</p>
                                <p className="text-xl font-bold text-blue-700">{managers}</p>
                            </div>
                            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                                <p className="text-xs text-indigo-700">Members</p>
                                <p className="text-xl font-bold text-indigo-700">{members}</p>
                            </div>
                            <div className="rounded-lg border border-violet-100 bg-violet-50 p-3">
                                <p className="text-xs text-violet-700">Can Verify</p>
                                <p className="text-xl font-bold text-violet-700">{verifiersEnabled}</p>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-xs text-slate-500">Clients</p>
                                <p className="text-xl font-bold text-slate-900">{totalClients}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                            Active clients: {activeClients} | Suspended clients: {suspendedClients}
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Live Work Tracker</h2>
                    {liveWorkItems.length === 0 ? (
                        <p className="text-sm text-slate-500 mt-3">No one is actively working on a task right now.</p>
                    ) : (
                        <div className="mt-3 space-y-2">
                            {liveWorkItems.map((item: any) => (
                                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                            <p className="text-xs text-slate-600 mt-0.5">
                                                {item.workerName} · {item.projectName}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.running ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {item.running ? 'Running' : 'Paused'}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
                                        <span>Session timer: {formatDuration(item.sessionSeconds)}</span>
                                        <span>Total worked: {formatDuration(item.totalWorkedSeconds)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <CreateTaskDrawer
                    isOpen={isTaskDrawerOpen}
                    onClose={() => {
                        setIsTaskDrawerOpen(false);
                        setSelectedTask(null);
                    }}
                    task={selectedTask}
                    initialProjectId={selectedTask?.projectId?._id?.toString?.() || selectedTask?.projectId?.toString?.()}
                />
            </div>
        );
    }

    if (isClient) {
        const projectNameById = new Map(
            projects.map((project: any) => [project._id?.toString?.() || project._id, project.name || 'Untitled Project'])
        );
        const clarificationRequiredTasks = tasks.filter(
            (task: any) => task.status === 'clarification' || task.needsClarification === true
        );

        return (
            <div className="p-6 bg-gradient-to-b from-slate-50 to-white min-h-full space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Client Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Tasks requiring your clarification</p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-amber-700">Clarification Required Tasks</h2>
                    {clarificationRequiredTasks.length === 0 ? (
                        <p className="text-sm text-slate-500 mt-3">No tasks currently require clarification.</p>
                    ) : (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {clarificationRequiredTasks.map((task: any) => {
                                const projectId = task?.projectId?._id?.toString?.() || task?.projectId?.toString?.() || '';
                                const projectName = projectNameById.get(projectId) || 'Unknown Project';
                                return (
                                    <div key={`clarification-client-${task._id}`} className="rounded-lg border border-amber-200 bg-white p-3">
                                        <p className="text-sm font-semibold text-slate-900">{String(task.title || 'Untitled task')}</p>
                                        <p className="text-xs text-slate-600 mt-1">Project: {String(projectName)}</p>
                                        <p className="text-xs text-amber-700 mt-1">Status: Clarification needed</p>
                                        <div className="mt-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedTask(task);
                                                    setIsTaskDrawerOpen(true);
                                                }}
                                                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded hover:bg-indigo-100"
                                            >
                                                Preview
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <CreateTaskDrawer
                    isOpen={isTaskDrawerOpen}
                    onClose={() => {
                        setIsTaskDrawerOpen(false);
                        setSelectedTask(null);
                    }}
                    task={selectedTask}
                    initialProjectId={selectedTask?.projectId?._id?.toString?.() || selectedTask?.projectId?.toString?.()}
                />
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
            <p>Welcome, {user?.email}</p>
        </div>
    );
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated, user, token } = useAuth();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const ide = params.get('ide');
    const redirectUri = params.get('redirect_uri');
    const state = params.get('state');
    const isIdeWebstorm = ide === 'webstorm';
    const hasValidIdeRedirect = isIdeWebstorm && isValidIdeRedirectUrl(redirectUri);

    if (!isAuthenticated) {
        const loginPath = hasValidIdeRedirect
            ? `/login?${params.toString()}`
            : '/login';
        return <Navigate to={loginPath} replace />;
    }
    if (hasValidIdeRedirect) {
        return <IdeAuthCallbackBridge token={token || ''} redirectUri={redirectUri!} state={state} />;
    }
    if (requiresProfileSetup(user)) {
        return <Navigate to="/profile/setup" replace />;
    }
    if (requiresGithubSetup(user)) {
        return <Navigate to="/github/setup" replace />;
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
    if (requiresProfileSetup(user)) {
        return <Navigate to="/profile/setup" replace />;
    }
    if (requiresGithubSetup(user)) {
        return <Navigate to="/github/setup" replace />;
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
    if (requiresProfileSetup(user)) {
        return <Navigate to="/profile/setup" replace />;
    }
    if (requiresGithubSetup(user)) {
        return <Navigate to="/github/setup" replace />;
    }
    if (user?.role !== 'admin' && user?.role !== 'manager') {
        return <Navigate to="/" />;
    }
    return <Layout>{children}</Layout>;
};

const InternalTeamRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    if (!user) {
        return null;
    }
    if (requiresProfileSetup(user)) {
        return <Navigate to="/profile/setup" replace />;
    }
    if (requiresGithubSetup(user)) {
        return <Navigate to="/github/setup" replace />;
    }
    if (!['admin', 'manager', 'member'].includes(user.role)) {
        return <Navigate to="/" replace />;
    }
    return <Layout>{children}</Layout>;
};

const GithubSetupRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    if (!user) {
        return null;
    }
    if (requiresProfileSetup(user)) {
        return <Navigate to="/profile/setup" replace />;
    }
    if (!['manager', 'member'].includes(user.role)) {
        return <Navigate to="/" replace />;
    }
    if (user.githubSetupCompleted) {
        return <Navigate to="/" replace />;
    }
    return children;
};

const ProfileSetupRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    if (!user) {
        return null;
    }
    if (user.profileSetupCompleted) {
        if (requiresGithubSetup(user)) {
            return <Navigate to="/github/setup" replace />;
        }
        return <Navigate to="/" replace />;
    }
    return children;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route
                path="/profile/setup"
                element={
                    <ProfileSetupRoute>
                        <ProfileSetup />
                    </ProfileSetupRoute>
                }
            />
            <Route
                path="/github/setup"
                element={
                    <GithubSetupRoute>
                        <GithubMemberSetup />
                    </GithubSetupRoute>
                }
            />
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
                path="/tasks"
                element={<Navigate to="/verifications" replace />}
            />
            <Route
                path="/verifications"
                element={
                    <ProtectedRoute>
                        <Verifications />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/chat"
                element={
                    <InternalTeamRoute>
                        <Chat />
                    </InternalTeamRoute>
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
                path="/dockploy"
                element={
                    <AdminRoute>
                        <DockployIntegration />
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
