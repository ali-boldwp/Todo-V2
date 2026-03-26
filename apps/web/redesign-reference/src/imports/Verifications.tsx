import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getTasks } from '../services/task';
import { getProjects } from '../services/core';
import CreateTaskDrawer from '../components/CreateTaskDrawer';

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const formatDateTime = (value?: string | Date) => {
    if (!value) return 'Unknown time';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return date.toLocaleString();
};

const getUserLabel = (value: any) => {
    if (!value) return 'Not assigned';
    if (typeof value === 'string') return value;
    const fullName = [value.firstName, value.lastName].filter(Boolean).join(' ').trim();
    return fullName || value.email || 'Unknown user';
};

const Verifications: React.FC = () => {
    const { user } = useAuth();
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const [selectedTask, setSelectedTask] = React.useState<any>(null);
    const [selectedProjectId, setSelectedProjectId] = React.useState<string>('all');

    const { data: tasks = [], isLoading: tasksLoading } = useQuery({
        queryKey: ['global-verification-tasks'],
        queryFn: () => getTasks(''),
    });
    const { data: projects = [], isLoading: projectsLoading } = useQuery({
        queryKey: ['global-verification-projects'],
        queryFn: getProjects,
    });

    if (tasksLoading || projectsLoading) return <div className="p-6 text-sm text-gray-500">Loading verifications...</div>;
    if (!['admin', 'manager', 'member', 'client'].includes(user?.role || '')) {
        return <div className="p-6 text-sm text-gray-500">You do not have access to verifications.</div>;
    }

    const projectNameById = new Map(
        projects.map((project: any) => [project?._id?.toString?.() || project?._id, project?.name || 'Untitled Project'])
    );

    const getId = (value: any) => value?._id?.toString?.() || value?.toString?.() || '';
    const myId = user?.id?.toString?.() || '';
    const canSeeAll = user?.role === 'admin' || user?.role === 'client';
    const matchesProjectFilter = (task: any) => {
        if (selectedProjectId === 'all') return true;
        const taskProjectId = task?.projectId?._id?.toString?.() || task?.projectId?.toString?.() || '';
        return taskProjectId === selectedProjectId;
    };
    const isRelatedToMe = (task: any) => {
        if (canSeeAll) return true;

        const verifierId = getId(task?.verifierId);
        const assigneeId = getId(task?.assigneeId);
        const activeWorkerId = getId(task?.activeWorkerId);
        const workedByMe = Array.isArray(task?.workLogs)
            && task.workLogs.some((log: any) => getId(log?.userId) === myId);
        return verifierId === myId || assigneeId === myId || activeWorkerId === myId || workedByMe;
    };

    const pending = tasks.filter((task: any) => {
        const isVerificationTask = task?.verificationStatus === 'pending' || task?.status === 'under_verification';
        return isVerificationTask && isRelatedToMe(task) && matchesProjectFilter(task);
    });
    const latestApproved = tasks
        .filter((task: any) => task?.verificationStatus === 'approved' && isRelatedToMe(task) && matchesProjectFilter(task))
        .sort((a: any, b: any) => {
            const aTime = new Date(a?.verificationDecidedAt || a?.updatedAt || 0).getTime();
            const bTime = new Date(b?.verificationDecidedAt || b?.updatedAt || 0).getTime();
            return bTime - aTime;
        })
        .slice(0, 12);

    return (
        <div className="p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Verifications</h2>
                <div className="flex items-center gap-2">
                    <label htmlFor="verification-project-filter" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Project
                    </label>
                    <select
                        id="verification-project-filter"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Projects</option>
                        {projects.map((project: any) => (
                            <option key={project._id} value={project._id?.toString?.() || project._id}>
                                {project.name || 'Untitled Project'}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {pending.length === 0 ? (
                <div className="text-sm text-gray-500">
                    {canSeeAll
                        ? 'No verification tasks found across projects.'
                        : 'No verification tasks related to you across projects.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {pending.map((task: any) => {
                        const projectId = task?.projectId?._id?.toString?.() || task?.projectId?.toString?.() || '';
                        const projectName = task?.projectId?.name || projectNameById.get(projectId) || 'Unknown Project';
                        return (
                            <div key={task._id} className="border border-gray-200 rounded-lg p-4 bg-white h-full">
                                <div className="flex items-start justify-between gap-3 h-full">
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-gray-900">{task.title}</h3>
                                        <p className="text-xs text-gray-500 mt-1">Project: {projectName}</p>
                                        <p className="text-xs text-gray-500 mt-1">Testing by: {getUserLabel(task?.verifierId)}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Total worked: {formatDuration(Number(task.totalWorkedSecondsComputed || task.totalWorkedSeconds || 0))}
                                        </p>
                                        {Array.isArray(task.workLogs) && task.workLogs.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {task.workLogs.map((log: any, idx: number) => {
                                                    const name = log.userId
                                                        ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim() || log.userId.email
                                                        : 'Unknown user';
                                                    return (
                                                        <div key={idx} className="text-xs text-gray-600">
                                                            {name}: <span className="font-medium">{formatDuration(Number(log.seconds || 0))}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedTask(task);
                                            setIsDrawerOpen(true);
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

            <CreateTaskDrawer
                isOpen={isDrawerOpen}
                onClose={() => { setIsDrawerOpen(false); setSelectedTask(null); }}
                task={selectedTask}
                initialProjectId={
                    selectedTask?.projectId?._id?.toString?.() ||
                    selectedTask?.projectId?.toString?.() ||
                    undefined
                }
            />

            <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Verified Tasks by Team</h2>
                {latestApproved.length === 0 ? (
                    <div className="text-sm text-gray-500">No approved verifications yet.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {latestApproved.map((task: any) => {
                            const projectId = task?.projectId?._id?.toString?.() || task?.projectId?.toString?.() || '';
                            const projectName = task?.projectId?.name || projectNameById.get(projectId) || 'Unknown Project';
                            return (
                                <div key={`approved-${task._id}`} className="border border-gray-200 rounded-lg p-4 bg-white h-full">
                                    <h3 className="text-sm font-semibold text-gray-900">{task.title}</h3>
                                    <p className="text-xs text-gray-500 mt-1">Project: {projectName}</p>
                                    <p className="text-xs text-gray-500 mt-1">Verified by: {getUserLabel(task?.verifierId)}</p>
                                    <p className="text-xs text-gray-500 mt-1">Verified at: {formatDateTime(task?.verificationDecidedAt || task?.updatedAt)}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Verifications;
