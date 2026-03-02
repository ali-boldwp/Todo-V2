import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTasks, deleteTask } from '../services/task';
import CreateTaskDrawer from '../components/CreateTaskDrawer';
import { useAuth } from '../context/AuthContext';
import {
    Plus,
    CheckCircle2,
    Clock,
    PlayCircle,
    Search,
    Filter,
    ArrowUpDown,
    Info,
    Eye,
    Trash2
} from 'lucide-react';

const PRIORITY_STYLES: any = {
    high: 'bg-red-50 text-red-700 border-red-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-100',
    low: 'bg-blue-50 text-blue-700 border-blue-100',
};

const Circle = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
    </svg>
);

const STATUS_ICONS: any = {
    todo: <Circle className="w-4 h-4 text-gray-400" />,
    in_progress: <PlayCircle className="w-4 h-4 text-blue-500" />,
    review: <Clock className="w-4 h-4 text-amber-500" />,
    done: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    under_verification: <CheckCircle2 className="w-4 h-4 text-violet-600" />,
    clarification: <Info className="w-4 h-4 text-red-500" />,
    clarified: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
};

const STATUS_LABELS: any = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    under_verification: 'Under Verification',
    clarification: 'Clarification',
    clarified: 'Clarified',
};

const STATUS_BADGES: any = {
    todo: 'bg-gray-100 text-gray-700 border-gray-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-100',
    review: 'bg-amber-50 text-amber-700 border-amber-100',
    done: 'bg-green-50 text-green-700 border-green-100',
    under_verification: 'bg-violet-50 text-violet-700 border-violet-100',
    clarification: 'bg-red-50 text-red-700 border-red-100',
    clarified: 'bg-blue-50 text-blue-700 border-blue-100',
};

const ProjectTasks: React.FC = () => {
    const { user } = useAuth();
    const canManageClarification = ['admin', 'manager', 'member'].includes(user?.role || '');
    const canDeleteTask = ['admin', 'manager', 'member'].includes(user?.role || '');
    const { id: projectId } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: () => getTasks(projectId!)
    });
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteTask(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        },
    });

    const handleOpenCreate = () => {
        setSelectedTask(null);
        setIsCreateDrawerOpen(true);
    };

    const handleOpenEdit = (task: any) => {
        setSelectedTask(task);
        setIsCreateDrawerOpen(true);
    };

    if (isLoading) return <div className="p-8 text-gray-500">Loading tasks...</div>;

    const filteredTasks = tasks?.filter((task: any) =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeleteTask = (task: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canDeleteTask || deleteMutation.isPending) return;
        const ok = window.confirm(`Delete task "${task.title}"?`);
        if (!ok) return;
        deleteMutation.mutate(task._id);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header / Toolbar */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center space-x-4 flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border-none rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
                        <Filter className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        New Task
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                        <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-3 border-b border-gray-100">
                                <div className="flex items-center cursor-pointer hover:text-gray-900">
                                    Task Name
                                    <ArrowUpDown className="w-3 h-3 ml-1.5" />
                                </div>
                            </th>
                            <th className="px-6 py-3 border-b border-gray-100">Status</th>
                            <th className="px-6 py-3 border-b border-gray-100">Priority</th>
                            <th className="px-6 py-3 border-b border-gray-100">Working</th>
                            <th className="px-6 py-3 border-b border-gray-100 text-right pr-12">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredTasks?.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                                    No tasks found
                                </td>
                            </tr>
                        ) : (
                            filteredTasks?.map((task: any) => (
                                <tr
                                    key={task._id}
                                    onClick={() => handleOpenEdit(task)}
                                    className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex-shrink-0">
                                                {task.status === 'clarification' ? (
                                                    <span title="Clarification required">
                                                        <Info className="w-4 h-4 text-red-500" />
                                                    </span>
                                                ) : (
                                                    STATUS_ICONS[task.status] || <Circle className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                            <span className={`text-sm font-medium transition-colors ${
                                                task.status === 'clarification'
                                                    ? 'text-red-600 group-hover:text-red-700'
                                                    : 'text-gray-900 group-hover:text-indigo-600'
                                            }`}>
                                                {task.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${STATUS_BADGES[task.status] || STATUS_BADGES.todo}`}>
                                            {STATUS_LABELS[task.status] || task.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                                            {task.priority || 'medium'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        {task.activeWorkerId ? (
                                            <div className="text-xs text-gray-700">
                                                <span className="font-semibold">
                                                    {task.activeWorkerId.firstName} {task.activeWorkerId.lastName}
                                                </span>
                                                {task.workStartedAt && (
                                                    <span className="text-gray-500"> · since {new Date(task.workStartedAt).toLocaleTimeString()}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">No one</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5 text-right pr-6">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEdit(task);
                                                }}
                                                className="p-1 rounded text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                title="View task"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {canManageClarification && task.status === 'clarification' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEdit(task);
                                                    }}
                                                    className="px-2 py-1 text-[11px] font-semibold rounded text-red-600 hover:bg-red-50 transition-all"
                                                >
                                                    Clarify
                                                </button>
                                            )}
                                            {canDeleteTask && (
                                                <button
                                                    onClick={(e) => handleDeleteTask(task, e)}
                                                    className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Delete task"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create / Edit Task Drawer */}
            <CreateTaskDrawer
                isOpen={isCreateDrawerOpen}
                onClose={() => { setIsCreateDrawerOpen(false); setSelectedTask(null); }}
                task={selectedTask}
                initialProjectId={projectId}
            />
        </div>
    );
};

export default ProjectTasks;
