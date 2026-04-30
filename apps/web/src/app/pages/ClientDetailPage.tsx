import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Building2,
    Mail,
    Phone,
    MapPin,
    User,
    Shield,
    ShieldOff,
    KeyRound,
    Trash2,
    LogIn,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Briefcase,
    TrendingUp,
    Filter,
    Eye,
    MoreVertical,
    Users,
    Timer,
    ListTodo,
    CheckCheck,
    BarChart3,
} from 'lucide-react';
import { getClient, toggleClientStatus, resetClientPassword, deleteClient, autoLoginClient } from '../../services/client';
import { getTasks } from '../../services/task';
import { getProjects } from '../../services/core';
import { getTeamMembers } from '../../services/team';
import { useAuth } from '../../context/AuthContext';
import { TaskPreviewDrawer } from '../components/TaskPreviewDrawer';

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

const formatDurationFull = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    todo: { label: 'To Do', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
    in_progress: { label: 'In Progress', color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
    under_verification: { label: 'Under Verification', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-200' },
    client_approval: { label: 'Client Approval', color: 'text-pink-700', bg: 'bg-pink-100', border: 'border-pink-200' },
    done: { label: 'Done', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
    completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
    clarification: { label: 'Needs Clarification', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    low: { label: 'Low', color: 'text-blue-700', bg: 'bg-blue-50' },
    medium: { label: 'Medium', color: 'text-amber-700', bg: 'bg-amber-50' },
    high: { label: 'High', color: 'text-rose-700', bg: 'bg-rose-50' },
    urgent: { label: 'Urgent', color: 'text-red-700', bg: 'bg-red-50' },
};

// Gradient palette for team member avatars
const AVATAR_GRADIENTS = [
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-blue-500 to-cyan-600',
    'from-violet-500 to-fuchsia-600',
    'from-lime-500 to-green-600',
    'from-red-500 to-rose-600',
];

export function ClientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { setAuthFromToken } = useAuth();
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [passwordResetModal, setPasswordResetModal] = useState<{ isOpen: boolean; password?: string }>({ isOpen: false });
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');

    const { data: client, isLoading: clientLoading } = useQuery({
        queryKey: ['client', id],
        queryFn: () => getClient(id!),
        enabled: !!id,
    });

    const { data: allTasks = [], isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks', 'all'],
        queryFn: () => getTasks('' as any).catch(() => []),
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const { data: teamMembers = [] } = useQuery({
        queryKey: ['teamMembers'],
        queryFn: getTeamMembers,
    });

    const toggleStatusMutation = useMutation({
        mutationFn: ({ status }: { status: 'active' | 'suspended' }) =>
            toggleClientStatus(id!, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client', id] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsMenuOpen(false);
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: () => resetClientPassword(id!),
        onSuccess: (data) => {
            setPasswordResetModal({ isOpen: true, password: data.password });
            setIsMenuOpen(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteClient(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            navigate('/clients');
        },
    });

    const autoLoginMutation = useMutation({
        mutationFn: () => autoLoginClient(id!),
        onSuccess: (data) => {
            setAuthFromToken(data.token);
            navigate('/');
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Failed to auto login');
            setIsMenuOpen(false);
        },
    });

    // Client tasks: tasks that have gone through or are in client approval flow
    const clientTasks = allTasks.filter((task: any) => {
        return task.status === 'client_approval'
            || task.clientApprovalStatus === 'pending'
            || task.clientApprovalStatus === 'approved'
            || task.clientApprovalStatus === 'rejected';
    });

    const pendingApprovalTasks = clientTasks.filter((task: any) =>
        task.status === 'client_approval' || task.clientApprovalStatus === 'pending'
    );
    const approvedTasks = clientTasks.filter((task: any) => task.clientApprovalStatus === 'approved');
    const rejectedTasks = clientTasks.filter((task: any) => task.clientApprovalStatus === 'rejected');

    const projectNameById = new Map(
        projects.map((p: any) => [p._id?.toString(), p.name || 'Unknown Project'])
    );

    const getProjectName = (task: any) => {
        const pid = task?.projectId?._id?.toString() || task?.projectId?.toString() || '';
        return task?.projectId?.name || projectNameById.get(pid) || 'Unknown Project';
    };

    const filteredTasks = clientTasks.filter((task: any) => {
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter || task.clientApprovalStatus === statusFilter;
        const taskProjectId = task?.projectId?._id?.toString() || task?.projectId?.toString() || '';
        const matchesProject = projectFilter === 'all' || taskProjectId === projectFilter;
        return matchesStatus && matchesProject;
    });

    // --- Team Performance Stats ---
    // Build per-member stats from ALL tasks (not just client tasks)
    const teamStats = useMemo(() => {
        return teamMembers.map((member: any, idx: number) => {
            const memberId = member._id?.toString();

            // Tasks assigned to this member
            const assignedTasks = allTasks.filter((t: any) => {
                const assigneeId = t.assigneeId?._id?.toString() || t.assigneeId?.toString() || '';
                return assigneeId === memberId;
            });

            // Tasks this member has worked on (via workLogs)
            const workedTasks = allTasks.filter((t: any) =>
                Array.isArray(t.workLogs) && t.workLogs.some((log: any) =>
                    (log.userId?._id?.toString() || log.userId?.toString()) === memberId
                )
            );

            // Unique tasks (union of assigned + worked)
            const allMemberTaskIds = new Set([
                ...assignedTasks.map((t: any) => t._id?.toString()),
                ...workedTasks.map((t: any) => t._id?.toString()),
            ]);

            const doneTasks = assignedTasks.filter((t: any) => t.status === 'done' || t.status === 'completed').length;
            const inProgressTasks = assignedTasks.filter((t: any) => t.status === 'in_progress').length;
            const pendingTasks = assignedTasks.filter((t: any) => t.status === 'todo').length;

            // Total seconds worked by this member across all workLogs
            let totalSeconds = 0;
            allTasks.forEach((t: any) => {
                if (!Array.isArray(t.workLogs)) return;
                t.workLogs.forEach((log: any) => {
                    const logUserId = log.userId?._id?.toString() || log.userId?.toString();
                    if (logUserId === memberId) {
                        totalSeconds += Number(log.seconds || 0);
                    }
                });
            });

            // Completion rate
            const totalAssigned = assignedTasks.length;
            const completionRate = totalAssigned > 0 ? Math.round((doneTasks / totalAssigned) * 100) : 0;

            return {
                member,
                gradient: AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length],
                totalTasks: allMemberTaskIds.size,
                assignedTasks: totalAssigned,
                doneTasks,
                inProgressTasks,
                pendingTasks,
                totalSeconds,
                completionRate,
            };
        })
        .filter((m: any) => m.assignedTasks > 0 || m.totalSeconds > 0)
        .sort((a: any, b: any) => b.assignedTasks - a.assignedTasks || b.totalSeconds - a.totalSeconds);
    }, [teamMembers, allTasks]);

    // Global team totals
    const totalTeamSeconds = teamStats.reduce((sum: number, m: any) => sum + m.totalSeconds, 0);
    const totalTeamTasks = allTasks.length;
    const totalDone = allTasks.filter((t: any) => t.status === 'done' || t.status === 'completed').length;
    const totalInProgress = allTasks.filter((t: any) => t.status === 'in_progress').length;

    if (clientLoading) return (
        <div className="min-h-full flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Loading client...</p>
            </div>
        </div>
    );

    if (!client) return (
        <div className="min-h-full flex items-center justify-center">
            <div className="text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                <p className="text-slate-700 font-semibold">Client not found</p>
                <button onClick={() => navigate('/clients')} className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                    ← Back to Clients
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-full p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Back Button */}
                <button
                    onClick={() => navigate('/clients')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium text-sm transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Clients
                </button>

                {/* Client Header Card */}
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                    <div className="relative flex items-start justify-between">
                        <div className="flex items-center gap-5">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${client.type === 'internal' ? 'bg-blue-500/30 border-2 border-blue-300/40' : 'bg-purple-500/30 border-2 border-purple-300/40'}`}>
                                <Building2 className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-3xl font-bold">{client.name}</h1>
                                    {client.status === 'suspended' && (
                                        <span className="px-3 py-1 rounded-full bg-red-500/30 border border-red-300/40 text-red-100 text-xs font-bold uppercase tracking-wide">
                                            Suspended
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${client.type === 'internal' ? 'bg-blue-400/30 text-blue-100' : 'bg-purple-400/30 text-purple-100'}`}>
                                        {client.type}
                                    </span>
                                    {client.userId && (
                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/30 text-emerald-100">
                                            <User className="w-3 h-3" />
                                            Portal Active
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>
                            {isMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl border border-slate-100 py-1 z-50">
                                        {client.status === 'suspended' ? (
                                            <button
                                                onClick={() => toggleStatusMutation.mutate({ status: 'active' })}
                                                disabled={toggleStatusMutation.isPending}
                                                className="w-full text-left px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-medium"
                                            >
                                                <Shield className="w-4 h-4" />
                                                Activate Client
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => toggleStatusMutation.mutate({ status: 'suspended' })}
                                                disabled={toggleStatusMutation.isPending}
                                                className="w-full text-left px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2 font-medium"
                                            >
                                                <ShieldOff className="w-4 h-4" />
                                                Suspend Client
                                            </button>
                                        )}
                                        {client.userId && (
                                            <button
                                                onClick={() => autoLoginMutation.mutate()}
                                                disabled={autoLoginMutation.isPending}
                                                className="w-full text-left px-4 py-2.5 text-sm text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 font-medium"
                                            >
                                                <LogIn className="w-4 h-4" />
                                                Auto Login as Client
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Reset password for ${client.name}?`)) {
                                                    resetPasswordMutation.mutate();
                                                }
                                            }}
                                            disabled={resetPasswordMutation.isPending}
                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                        >
                                            <KeyRound className="w-4 h-4" />
                                            Reset Password
                                        </button>
                                        <div className="my-1 border-t border-slate-100" />
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Delete ${client.name}? This cannot be undone.`)) {
                                                    deleteMutation.mutate();
                                                }
                                            }}
                                            disabled={deleteMutation.isPending}
                                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete Client
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="relative flex flex-wrap gap-5 mt-6 pt-6 border-t border-white/20">
                        {client.email && (
                            <div className="flex items-center gap-2 text-sm text-white/80">
                                <Mail className="w-4 h-4 text-white/60" />
                                <span>{client.email}</span>
                            </div>
                        )}
                        {client.phone && (
                            <div className="flex items-center gap-2 text-sm text-white/80">
                                <Phone className="w-4 h-4 text-white/60" />
                                <span>{client.phone}</span>
                            </div>
                        )}
                        {client.address && (
                            <div className="flex items-center gap-2 text-sm text-white/80">
                                <MapPin className="w-4 h-4 text-white/60" />
                                <span>{client.address}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── CLIENT TASK STATS ── */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-pink-500 to-rose-600 rounded-full" />
                        <h2 className="text-base font-bold text-slate-700 uppercase tracking-wide">Client Approval Overview</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-pink-600" />
                                </div>
                                <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">Pending</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{pendingApprovalTasks.length}</p>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-1">Awaiting Approval</p>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                </div>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Approved</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{approvedTasks.length}</p>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-1">Approved</p>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                                    <XCircle className="w-5 h-5 text-rose-600" />
                                </div>
                                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Rejected</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{rejectedTasks.length}</p>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-1">Rejected</p>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                                </div>
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Total</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{clientTasks.length}</p>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-1">Client Tasks</p>
                        </div>
                    </div>
                </div>

                {/* ── TEAM PERFORMANCE ── */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full" />
                        <h2 className="text-base font-bold text-slate-700 uppercase tracking-wide">Team Performance</h2>
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">{teamStats.length} members</span>
                    </div>

                    {/* Team Overview Mini Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border-2 border-indigo-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Team Size</p>
                            </div>
                            <p className="text-3xl font-bold text-indigo-900">{teamStats.length}</p>
                            <p className="text-xs text-indigo-600 mt-1">Active contributors</p>
                        </div>

                        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-5 border-2 border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
                                    <ListTodo className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Total Tasks</p>
                            </div>
                            <p className="text-3xl font-bold text-slate-900">{totalTeamTasks}</p>
                            <p className="text-xs text-slate-500 mt-1">{totalInProgress} in progress</p>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border-2 border-emerald-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                                    <CheckCheck className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Completed</p>
                            </div>
                            <p className="text-3xl font-bold text-emerald-900">{totalDone}</p>
                            <p className="text-xs text-emerald-600 mt-1">
                                {totalTeamTasks > 0 ? Math.round((totalDone / totalTeamTasks) * 100) : 0}% completion rate
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
                                    <Timer className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Total Time</p>
                            </div>
                            <p className="text-3xl font-bold text-amber-900">{formatDuration(totalTeamSeconds)}</p>
                            <p className="text-xs text-amber-600 mt-1">Across all members</p>
                        </div>
                    </div>

                    {/* Per-Member Breakdown */}
                    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                            <BarChart3 className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-slate-800">Member Breakdown — Tasks & Time</h3>
                        </div>

                        {teamStats.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-slate-600 font-medium">No team activity yet</p>
                                <p className="text-sm text-slate-400 mt-1">Team stats will appear once tasks are assigned and worked on</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {/* Table Header */}
                                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50/60 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <div className="col-span-3">Member</div>
                                    <div className="col-span-2 text-center">Assigned</div>
                                    <div className="col-span-2 text-center">Done</div>
                                    <div className="col-span-2 text-center">In Progress</div>
                                    <div className="col-span-2 text-right">Time Logged</div>
                                    <div className="col-span-1 text-right">Rate</div>
                                </div>

                                {teamStats.map((stat: any) => {
                                    const member = stat.member;
                                    const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'Unknown';
                                    const initials = member.firstName && member.lastName
                                        ? `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                                        : (member.email?.[0] || '?').toUpperCase();

                                    // Time bar width relative to the max member's time
                                    const maxSeconds = teamStats[0]?.totalSeconds || 1;
                                    const barWidth = Math.max(4, Math.round((stat.totalSeconds / maxSeconds) * 100));

                                    return (
                                        <div key={member._id} className="px-6 py-4 hover:bg-slate-50/80 transition-colors">
                                            {/* Mobile layout */}
                                            <div className="md:hidden space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                                        {initials}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-slate-900 truncate">{fullName}</p>
                                                        <p className="text-xs text-slate-500 capitalize">{member.role || 'member'}</p>
                                                    </div>
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stat.completionRate >= 80 ? 'bg-emerald-100 text-emerald-700' : stat.completionRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {stat.completionRate}%
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                                                        <p className="text-lg font-bold text-slate-900">{stat.assignedTasks}</p>
                                                        <p className="text-[10px] text-slate-500 font-semibold uppercase">Assigned</p>
                                                    </div>
                                                    <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                                                        <p className="text-lg font-bold text-emerald-700">{stat.doneTasks}</p>
                                                        <p className="text-[10px] text-emerald-600 font-semibold uppercase">Done</p>
                                                    </div>
                                                    <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                                                        <p className="text-lg font-bold text-amber-700">{formatDuration(stat.totalSeconds)}</p>
                                                        <p className="text-[10px] text-amber-600 font-semibold uppercase">Time</p>
                                                    </div>
                                                </div>
                                                {/* Time bar */}
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full bg-gradient-to-r ${stat.gradient} rounded-full transition-all`}
                                                        style={{ width: `${barWidth}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Desktop layout */}
                                            <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                                                {/* Member info */}
                                                <div className="col-span-3 flex items-center gap-3 min-w-0">
                                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-900 truncate text-sm">{fullName}</p>
                                                        <p className="text-xs text-slate-400 capitalize">{member.role || 'member'}</p>
                                                    </div>
                                                </div>

                                                {/* Assigned */}
                                                <div className="col-span-2 text-center">
                                                    <span className="text-lg font-bold text-slate-900">{stat.assignedTasks}</span>
                                                </div>

                                                {/* Done */}
                                                <div className="col-span-2 text-center">
                                                    <span className="text-lg font-bold text-emerald-600">{stat.doneTasks}</span>
                                                </div>

                                                {/* In Progress */}
                                                <div className="col-span-2 text-center">
                                                    <span className="text-lg font-bold text-blue-600">{stat.inProgressTasks}</span>
                                                </div>

                                                {/* Time with bar */}
                                                <div className="col-span-2 text-right">
                                                    <p className="text-sm font-bold text-slate-900">{formatDuration(stat.totalSeconds)}</p>
                                                    <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full bg-gradient-to-r ${stat.gradient} rounded-full`}
                                                            style={{ width: `${barWidth}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Completion rate */}
                                                <div className="col-span-1 text-right">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.completionRate >= 80 ? 'bg-emerald-100 text-emerald-700' : stat.completionRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {stat.completionRate}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── PENDING APPROVAL ── */}
                {pendingApprovalTasks.length > 0 && (
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-pink-900">Tasks Awaiting Client Approval</h2>
                                <p className="text-sm text-pink-600">{pendingApprovalTasks.length} task{pendingApprovalTasks.length !== 1 ? 's' : ''} need review from this client</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {pendingApprovalTasks.map((task: any) => (
                                <button
                                    key={task._id}
                                    onClick={() => setSelectedTask(task)}
                                    className="text-left bg-white rounded-xl p-4 border border-pink-200 hover:border-pink-400 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className="text-sm font-bold text-slate-900 group-hover:text-pink-700 transition-colors line-clamp-2">
                                            {task.title}
                                        </span>
                                        <Eye className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Briefcase className="w-3.5 h-3.5" />
                                        <span>{getProjectName(task)}</span>
                                    </div>
                                    {(task.totalWorkedSeconds || task.totalWorkedSecondsComputed) > 0 && (
                                        <div className="flex items-center gap-2 text-xs text-indigo-500 mt-1 font-medium">
                                            <Timer className="w-3.5 h-3.5" />
                                            <span>{formatDurationFull(task.totalWorkedSecondsComputed || task.totalWorkedSeconds)} worked</span>
                                        </div>
                                    )}
                                    {task.finishedAt && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Finished {new Date(task.finishedAt).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── ALL CLIENT TASKS TABLE ── */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">All Client Tasks</h2>
                        <div className="flex items-center gap-3">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-9 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">All Status</option>
                                <option value="client_approval">Awaiting Approval</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <select
                                value={projectFilter}
                                onChange={(e) => setProjectFilter(e.target.value)}
                                className="h-9 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">All Projects</option>
                                {projects.map((p: any) => (
                                    <option key={p._id} value={p._id?.toString()}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {tasksLoading ? (
                        <div className="p-12 text-center">
                            <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">Loading tasks...</p>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <Briefcase className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-600 font-medium mb-1">No tasks found</p>
                            <p className="text-sm text-slate-400">
                                {clientTasks.length === 0
                                    ? 'No tasks have been sent to this client for approval yet.'
                                    : 'No tasks match the current filters.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {filteredTasks.map((task: any) => {
                                const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG['todo'];
                                const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['medium'];
                                const approvalStatus = task.clientApprovalStatus;

                                return (
                                    <div
                                        key={task._id}
                                        onClick={() => setSelectedTask(task)}
                                        className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors truncate mb-1">
                                                {task.title}
                                            </p>
                                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Briefcase className="w-3 h-3" />
                                                    {getProjectName(task)}
                                                </span>
                                                {task.finishedAt && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(task.finishedAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {(task.totalWorkedSeconds || task.totalWorkedSecondsComputed) > 0 && (
                                                    <span className="flex items-center gap-1 text-indigo-500 font-medium">
                                                        <Timer className="w-3 h-3" />
                                                        {formatDurationFull(task.totalWorkedSecondsComputed || task.totalWorkedSeconds)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                                            {statusCfg.label}
                                        </span>

                                        <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${priorityCfg.bg} ${priorityCfg.color}`}>
                                            {priorityCfg.label}
                                        </span>

                                        {approvalStatus && approvalStatus !== 'none' && (
                                            <span className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                approvalStatus === 'approved'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : approvalStatus === 'rejected'
                                                        ? 'bg-rose-100 text-rose-700'
                                                        : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {approvalStatus === 'approved' && <CheckCircle className="w-3 h-3" />}
                                                {approvalStatus === 'rejected' && <XCircle className="w-3 h-3" />}
                                                {approvalStatus === 'pending' && <Clock className="w-3 h-3" />}
                                                {approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}
                                            </span>
                                        )}

                                        <Eye className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Task Preview Drawer */}
            <TaskPreviewDrawer
                key={selectedTask?._id}
                task={selectedTask}
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
            />

            {/* Password Reset Modal */}
            {passwordResetModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
                        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <KeyRound className="w-7 h-7 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Password Reset</h2>
                        <p className="text-slate-500 text-sm mb-4">Copy the new password and share it with the client securely.</p>
                        <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between mb-6 border border-slate-200">
                            <span className="font-mono font-bold text-slate-800 text-base">{passwordResetModal.password}</span>
                            <button
                                onClick={() => navigator.clipboard.writeText(passwordResetModal.password || '')}
                                className="text-indigo-600 hover:text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors ml-2"
                            >
                                Copy
                            </button>
                        </div>
                        <button
                            onClick={() => setPasswordResetModal({ isOpen: false })}
                            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
