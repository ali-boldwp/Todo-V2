import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, createTask, updateTask } from '../services/task';
import {
    Plus,
    MoreHorizontal,
    CheckCircle2,
    Clock,
    PlayCircle,
    Search,
    Filter,
    ArrowUpDown
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
};

const STATUS_LABELS: any = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
};

const ProjectTasks: React.FC = () => {
    const { id: projectId } = useParams<{ id: string }>();
    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: () => getTasks(projectId!)
    });
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const createMutation = useMutation({
        mutationFn: createTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            setIsModalOpen(false);
            setNewTaskTitle('');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => updateTask(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;
        createMutation.mutate({
            projectId,
            title: newTaskTitle,
            status: 'todo',
            priority: 'medium',
            type: 'task',
        } as any);
    };

    if (isLoading) return <div className="p-8 text-gray-500">Loading tasks...</div>;

    const filteredTasks = tasks?.filter((task: any) =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        onClick={() => setIsModalOpen(true)}
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
                            <th className="px-6 py-3 border-b border-gray-100 text-right pr-12">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredTasks?.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500 text-sm">
                                    No tasks found
                                </td>
                            </tr>
                        ) : (
                            filteredTasks?.map((task: any) => (
                                <tr key={task._id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer">
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex-shrink-0">
                                                {STATUS_ICONS[task.status] || <Circle className="w-4 h-4 text-gray-400" />}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                {task.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <select
                                            value={task.status}
                                            onChange={(e) => updateMutation.mutate({ id: task._id, data: { status: e.target.value } })}
                                            className="text-xs font-medium text-gray-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:text-gray-900"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {Object.keys(STATUS_LABELS).map(key => (
                                                <option key={key} value={key}>{STATUS_LABELS[key]}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                                            {task.priority || 'medium'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-right pr-6">
                                        <button className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Create New Task</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6">
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Task Title</label>
                                <input
                                    autoFocus
                                    className="w-full bg-gray-50 border-gray-100 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                                    placeholder="What needs to be done?"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectTasks;
