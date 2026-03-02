import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProject, updateProject } from '../services/core';
import { getTasks } from '../services/task';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import ProjectTasks from './ProjectTasks';
import ProjectSettings from './ProjectSettings';
import ProjectDocuments from './ProjectDocuments';
import Sprints from './Sprints';
import ProjectVerifications from './ProjectVerifications';
import ProjectAccess from './ProjectAccess';
import RichTextEditor from '../components/RichTextEditor';
import {
    CalendarDays,
    Flag,
    Eye,
    Users,
    Clock3,
    Building2,
    GitBranch,
    CheckCircle2,
} from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    completed: 'bg-green-50 text-green-700 border-green-100',
    archived: 'bg-gray-100 text-gray-700 border-gray-200',
    on_hold: 'bg-amber-50 text-amber-700 border-amber-100',
    draft: 'bg-blue-50 text-blue-700 border-blue-100',
};

const PRIORITY_STYLE: Record<string, string> = {
    low: 'text-blue-600 bg-blue-50 border-blue-100',
    medium: 'text-amber-600 bg-amber-50 border-amber-100',
    high: 'text-red-600 bg-red-50 border-red-100',
};

const formatDate = (value?: string | Date) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return date.toLocaleDateString();
};

const getTimelineStatus = (endDate?: string | Date) => {
    if (!endDate) return { label: 'No deadline', tone: 'text-gray-500' };
    const end = new Date(endDate).getTime();
    if (Number.isNaN(end)) return { label: 'No deadline', tone: 'text-gray-500' };
    const diffDays = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: `${Math.abs(diffDays)} days overdue`, tone: 'text-red-600' };
    if (diffDays === 0) return { label: 'Due today', tone: 'text-amber-600' };
    return { label: `${diffDays} days left`, tone: 'text-emerald-600' };
};

const ProjectOverview = ({ project }: { project: any }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [saved, setSaved] = useState(false);
    const timelineStatus = useMemo(() => getTimelineStatus(project?.endDate), [project?.endDate]);
    const memberCount = Array.isArray(project?.members) ? project.members.length : 0;
    const clientName = typeof project?.clientId === 'object' ? project.clientId?.name : '';
    const hasGithubRepo = Boolean(project?.githubRepoOwner && project?.githubRepoName);
    const isAdmin = user?.role === 'admin';
    const canSeeLiveUrl = user?.role === 'admin' || user?.role === 'client';
    const canSeeDevUrl = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'member';
    const { data: projectTasks = [], isLoading: statsLoading } = useQuery({
        queryKey: ['project-overview-stats', project?._id],
        queryFn: () => getTasks(project._id),
        enabled: Boolean(isAdmin && project?._id),
    });

    const adminStats = useMemo(() => {
        if (!isAdmin) return null;
        const getUserId = (value: any) => value?._id?.toString?.() || value?.toString?.() || '';
        const getUserLabel = (value: any) => {
            if (!value) return 'Unknown';
            if (typeof value === 'string') return value;
            const fullName = [value.firstName, value.lastName].filter(Boolean).join(' ').trim();
            return fullName || value.email || 'Unknown';
        };

        const totalTasks = projectTasks.length;
        const doneTasks = projectTasks.filter((task: any) => task.status === 'done').length;
        const inProgressTasks = projectTasks.filter((task: any) => task.status === 'in_progress').length;
        const pendingVerification = projectTasks.filter(
            (task: any) => task.status === 'under_verification' || task.verificationStatus === 'pending'
        ).length;
        const overdueTasks = projectTasks.filter((task: any) => {
            if (!task?.dueDate) return false;
            if (task.status === 'done') return false;
            const due = new Date(task.dueDate).getTime();
            return !Number.isNaN(due) && due < Date.now();
        }).length;
        const assignedTasks = projectTasks.filter((task: any) => Boolean(task.assigneeId)).length;
        const activeWorkers = new Set(
            projectTasks
                .map((task: any) => task.activeWorkerId?._id || task.activeWorkerId || null)
                .filter(Boolean)
        ).size;
        const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        const workedTaskMap = new Map<string, { name: string; taskCount: number }>();

        for (const task of projectTasks) {
            const seenUsersInTask = new Set<string>();
            const workLogs = Array.isArray(task?.workLogs) ? task.workLogs : [];
            for (const entry of workLogs) {
                const user = entry?.userId;
                const userId = getUserId(user);
                if (!userId || seenUsersInTask.has(userId)) continue;
                seenUsersInTask.add(userId);
                const existing = workedTaskMap.get(userId);
                if (existing) {
                    existing.taskCount += 1;
                } else {
                    workedTaskMap.set(userId, { name: getUserLabel(user), taskCount: 1 });
                }
            }

            const activeWorkerId = getUserId(task?.activeWorkerId);
            if (activeWorkerId && !seenUsersInTask.has(activeWorkerId)) {
                const existing = workedTaskMap.get(activeWorkerId);
                if (existing) {
                    existing.taskCount += 1;
                } else {
                    workedTaskMap.set(activeWorkerId, { name: getUserLabel(task?.activeWorkerId), taskCount: 1 });
                }
            }
        }

        const workedByUsers = Array.from(workedTaskMap.entries())
            .map(([id, value]) => ({ id, ...value }))
            .sort((a, b) => b.taskCount - a.taskCount || a.name.localeCompare(b.name))
            .slice(0, 8);

        const latestCompletedTasks = projectTasks
            .filter((task: any) => task.status === 'done')
            .map((task: any) => {
                const workLogs = Array.isArray(task?.workLogs) ? task.workLogs : [];
                const topWorker = workLogs
                    .filter((entry: any) => entry?.userId)
                    .sort((a: any, b: any) => Number(b?.seconds || 0) - Number(a?.seconds || 0))[0];
                const doneBy = topWorker?.userId || task?.assigneeId;
                const doneAtRaw = task?.finishedAt || task?.updatedAt || task?.createdAt;
                const doneAt = doneAtRaw ? new Date(doneAtRaw) : null;

                return {
                    id: task._id,
                    title: task.title || 'Untitled task',
                    doneBy: getUserLabel(doneBy),
                    doneAt: doneAt && !Number.isNaN(doneAt.getTime()) ? doneAt : null,
                };
            })
            .sort((a, b) => {
                const aTime = a.doneAt ? a.doneAt.getTime() : 0;
                const bTime = b.doneAt ? b.doneAt.getTime() : 0;
                return bTime - aTime;
            })
            .slice(0, 6);

        return {
            totalTasks,
            doneTasks,
            inProgressTasks,
            pendingVerification,
            overdueTasks,
            assignedTasks,
            unassignedTasks: Math.max(totalTasks - assignedTasks, 0),
            activeWorkers,
            completionRate,
            workedByUsers,
            latestCompletedTasks,
        };
    }, [isAdmin, projectTasks]);

    const updateMutation = useMutation({
        mutationFn: (description: any) => updateProject(project._id, { description }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', project._id] });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        },
    });

    const handleChange = useCallback(
        (data: any) => {
            updateMutation.mutate(data);
        },
        [project._id]
    );

    const initialData =
        project.description && typeof project.description === 'object'
            ? project.description
            : undefined;

    return (
        <div className="p-6 space-y-6 bg-gradient-to-b from-slate-50 to-white min-h-full">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-semibold">Project Overview</p>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{project?.name || 'Untitled Project'}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${STATUS_STYLE[project?.status] || STATUS_STYLE.active}`}>
                            {project?.status || 'active'}
                        </span>
                        {saved && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 text-xs font-semibold">
                                <CheckCircle2 size={13} />
                                Saved
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                            <Flag size={14} />
                            Priority
                        </div>
                        <div className={`mt-2 inline-flex px-2 py-1 rounded-md border text-xs font-bold uppercase ${PRIORITY_STYLE[project?.priority] || PRIORITY_STYLE.medium}`}>
                            {project?.priority || 'medium'}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                            <Eye size={14} />
                            Visibility
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-800 capitalize">{project?.visibility || 'private'}</div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                            <Users size={14} />
                            Team Members
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-800">{memberCount}</div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                            <Clock3 size={14} />
                            Timeline
                        </div>
                        <div className={`mt-2 text-sm font-semibold ${timelineStatus.tone}`}>{timelineStatus.label}</div>
                    </div>
                </div>
            </div>

            {isAdmin && (
                <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 shadow-sm p-5 md:p-6">
                    <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-indigo-700">Project Work Stats</h2>
                    {statsLoading || !adminStats ? (
                        <p className="mt-3 text-sm text-slate-500">Loading project stats...</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
                            <div className="rounded-xl border border-indigo-100 bg-white p-3.5">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Total Tasks</p>
                                <p className="mt-1 text-xl font-bold text-slate-900">{adminStats.totalTasks}</p>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-white p-3.5">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
                                <p className="mt-1 text-xl font-bold text-emerald-700">{adminStats.doneTasks} ({adminStats.completionRate}%)</p>
                            </div>
                            <div className="rounded-xl border border-amber-100 bg-white p-3.5">
                                <p className="text-xs uppercase tracking-wide text-slate-500">In Progress</p>
                                <p className="mt-1 text-xl font-bold text-amber-700">{adminStats.inProgressTasks}</p>
                            </div>
                            <div className="rounded-xl border border-blue-100 bg-white p-3.5">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Pending Verification</p>
                                <p className="mt-1 text-xl font-bold text-blue-700">{adminStats.pendingVerification}</p>
                            </div>
                            <div className="rounded-xl border border-red-100 bg-white p-3.5">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Overdue</p>
                                <p className="mt-1 text-xl font-bold text-red-700">{adminStats.overdueTasks}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Assigned / Unassigned</p>
                                <p className="mt-1 text-xl font-bold text-slate-900">
                                    {adminStats.assignedTasks} / {adminStats.unassignedTasks}
                                </p>
                            </div>
                            <div className="rounded-xl border border-violet-100 bg-white p-3.5">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Project Members</p>
                                <p className="mt-1 text-xl font-bold text-violet-700">{memberCount}</p>
                            </div>
                            <div className="rounded-xl border border-cyan-100 bg-white p-3.5">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Active Workers</p>
                                <p className="mt-1 text-xl font-bold text-cyan-700">{adminStats.activeWorkers}</p>
                            </div>
                        </div>
                    )}

                    {!statsLoading && adminStats && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Who Worked On How Many Tasks</p>
                                {adminStats.workedByUsers.length === 0 ? (
                                    <p className="text-sm text-slate-400">No work activity yet.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {adminStats.workedByUsers.map((entry: any) => (
                                            <div key={entry.id} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-700 truncate pr-2">{entry.name}</span>
                                                <span className="font-semibold text-slate-900">{entry.taskCount}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Latest Tasks Done By</p>
                                {adminStats.latestCompletedTasks.length === 0 ? (
                                    <p className="text-sm text-slate-400">No completed tasks yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {adminStats.latestCompletedTasks.map((item: any) => (
                                            <div key={item.id} className="text-sm">
                                                <p className="font-medium text-slate-800 truncate">{item.title}</p>
                                                <p className="text-xs text-slate-500">
                                                    {item.doneBy}{item.doneAt ? ` · ${item.doneAt.toLocaleString()}` : ''}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                    <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Project Details</h2>
                    <div className="mt-4 space-y-4 text-sm">
                        <div className="flex items-start gap-2">
                            <Building2 size={16} className="text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-slate-500 text-xs uppercase tracking-wide">Client</p>
                                <p className="font-semibold text-slate-800">{clientName || 'Not assigned'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <CalendarDays size={16} className="text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-slate-500 text-xs uppercase tracking-wide">Dates</p>
                                <p className="font-semibold text-slate-800">Start: {formatDate(project?.startDate)}</p>
                                <p className="font-semibold text-slate-800">End: {formatDate(project?.endDate)}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <GitBranch size={16} className="text-slate-400 mt-0.5" />
                            <div className="min-w-0">
                                <p className="text-slate-500 text-xs uppercase tracking-wide">Repository</p>
                                {hasGithubRepo ? (
                                    <a
                                        href={`https://github.com/${project.githubRepoOwner}/${project.githubRepoName}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-semibold text-blue-600 hover:text-blue-700 break-all"
                                    >
                                        {project.githubRepoOwner}/{project.githubRepoName}
                                    </a>
                                ) : (
                                    <p className="font-semibold text-slate-800">Not connected</p>
                                )}
                            </div>
                        </div>

                        {canSeeLiveUrl && (
                            <div className="flex items-start gap-2">
                                <Eye size={16} className="text-slate-400 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-slate-500 text-xs uppercase tracking-wide">Project URL (Live)</p>
                                    {project?.projectUrl ? (
                                        <a
                                            href={project.projectUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-semibold text-blue-600 hover:text-blue-700 break-all"
                                        >
                                            {project.projectUrl}
                                        </a>
                                    ) : (
                                        <p className="font-semibold text-slate-800">Not set</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {canSeeDevUrl && (
                            <div className="flex items-start gap-2">
                                <GitBranch size={16} className="text-slate-400 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-slate-500 text-xs uppercase tracking-wide">Dev URL</p>
                                    {project?.devWebsiteUrl ? (
                                        <a
                                            href={project.devWebsiteUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-semibold text-blue-600 hover:text-blue-700 break-all"
                                        >
                                            {project.devWebsiteUrl}
                                        </a>
                                    ) : (
                                        <p className="font-semibold text-slate-800">Not set</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Overview Notes</h2>
                        <p className="text-xs text-slate-400 mt-1">Use this as the source of truth for goals, architecture, and decisions.</p>
                    </div>
                    <div className="min-h-[420px]">
                        <RichTextEditor
                            holder={`overview-editor-${project._id}`}
                            data={initialData}
                            onChange={handleChange}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { joinProject, leaveProject } = useSocket();
    const { user } = useAuth();

    const { data: project, isLoading } = useQuery({
        queryKey: ['project', id],
        queryFn: () => getProject(id!),
    });

    // Join this project's socket room so we receive real-time task events
    useEffect(() => {
        if (!id) return;
        joinProject(id);
        return () => leaveProject(id);
    }, [id]);

    if (isLoading) return <div>Loading...</div>;
    if (!project) return <div>Project not found</div>;

    return (
        <div className="h-full overflow-auto">
            <Routes>
                <Route path="/" element={<ProjectOverview project={project} />} />
                <Route path="/overview" element={<ProjectOverview project={project} />} />
                <Route path="/tasks" element={<ProjectTasks />} />
                <Route path="/verifications" element={<ProjectVerifications />} />
                <Route path="/documents" element={<ProjectDocuments />} />
                <Route path="/access" element={<ProjectAccess />} />
                <Route path="/sprints" element={<Sprints />} />
                <Route
                    path="/settings"
                    element={
                        user?.role === 'admin' || user?.role === 'manager'
                            ? <ProjectSettings project={project} />
                            : <Navigate to={`/projects/${project._id}/overview`} replace />
                    }
                />
                <Route path="*" element={<div className="text-gray-400 text-sm">Module coming soon...</div>} />
            </Routes>
        </div>
    );
};

export default ProjectDetails;
