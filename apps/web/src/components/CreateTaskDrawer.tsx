import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Drawer from './Drawer';
import RichTextEditor from './RichTextEditor';
import TaskComments from './TaskComments';
import { getProjects } from '../services/core';
import { createTask, updateTask } from '../services/task';
import {
    Flag,
    CheckCircle2,
    Folder,
    Save,
    AlertCircle,
    Info
} from 'lucide-react';
import { OutputData } from '@editorjs/editorjs';

interface CreateTaskDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    task?: any; // If provided, we are in edit mode
    initialProjectId?: string;
}

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low', color: 'text-blue-500', bg: 'bg-blue-50' },
    { value: 'medium', label: 'Medium', color: 'text-amber-500', bg: 'bg-amber-50' },
    { value: 'high', label: 'High', color: 'text-red-500', bg: 'bg-red-50' },
    { value: 'urgent', label: 'Urgent', color: 'text-purple-500', bg: 'bg-purple-50' },
];

const STATUS_OPTIONS = [
    { value: 'todo', label: 'To Do', color: 'text-gray-500' },
    { value: 'in_progress', label: 'In Progress', color: 'text-blue-500' },
    { value: 'review', label: 'Review', color: 'text-amber-500' },
    { value: 'done', label: 'Done', color: 'text-green-500' },
];

const CreateTaskDrawer: React.FC<CreateTaskDrawerProps> = ({ isOpen, onClose, task, initialProjectId }) => {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState(task?.title || '');
    const [status, setStatus] = useState(task?.status || 'todo');
    const [priority, setPriority] = useState(task?.priority || 'medium');
    const [projectId, setProjectId] = useState(task?.projectId || initialProjectId || '');
    const [description, setDescription] = useState<OutputData | undefined>(task?.description);
    const [needsClarification, setNeedsClarification] = useState(task?.needsClarification || false);

    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
        enabled: isOpen,
    });

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setStatus(task.status);
            setPriority(task.priority);
            setProjectId(task.projectId);
            setDescription(task.description);
            setNeedsClarification(task.needsClarification || false);
        } else {
            setTitle('');
            setStatus('todo');
            setPriority('medium');
            setProjectId(initialProjectId || '');
            setDescription(undefined);
            setNeedsClarification(false);
        }
    }, [task, initialProjectId, isOpen]);

    const mutation = useMutation({
        mutationFn: (data: any) => task ? updateTask(task._id, data) : createTask(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            onClose();
        },
    });

    const handleSave = () => {
        if (!title || !projectId) return;
        mutation.mutate({
            title,
            status,
            priority,
            projectId,
            description,
            needsClarification,
            type: 'task',
        });
    };

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={task ? 'Edit Task' : 'Create New Task'}
        >
            <div className="space-y-8 pb-32">
                {/* Title Input */}
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task Title"
                    className="w-full text-3xl font-bold border-none focus:ring-0 placeholder-gray-200 p-0"
                    autoFocus
                />

                {/* Metadata Bar */}
                <div className="grid grid-cols-2 gap-4 py-6 border-y border-gray-100">
                    <div className="flex items-center space-x-3 group">
                        <CheckCircle2 className="w-4 h-4 text-gray-400" />
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full bg-transparent border-none p-0 text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                            >
                                {STATUS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 group">
                        <Flag className="w-4 h-4 text-gray-400" />
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full bg-transparent border-none p-0 text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                            >
                                {PRIORITY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 group">
                        <Folder className="w-4 h-4 text-gray-400" />
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Project</label>
                            <select
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                className="w-full bg-transparent border-none p-0 text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                            >
                                <option value="" disabled>Select Project</option>
                                {projects?.map((p: any) => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 group">
                        <Info className="w-4 h-4 text-gray-400" />
                        <div className="flex-1 flex items-center justify-between pr-2">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Clarification</label>
                                <span className="text-sm font-medium text-gray-700">Needs attention</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={needsClarification}
                                onChange={(e) => setNeedsClarification(e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Clarification Banner */}
                {needsClarification && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex items-start space-x-3 animate-pulse">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-900">Clarification Requested</p>
                            <p className="text-xs text-amber-700 mt-0.5">The author or a team member is requesting more information about this task.</p>
                        </div>
                    </div>
                )}

                {/* EditorJS Section */}
                <div className="min-h-[300px]">
                    <RichTextEditor
                        holder={task ? `editor-${task._id}` : 'new-task-editor'}
                        data={description}
                        onChange={setDescription}
                    />
                </div>

                {/* Comments Section (Only in edit mode or if taskId exists) */}
                {task && (
                    <div className="pt-8 border-t border-gray-100">
                        <TaskComments taskId={task._id} />
                    </div>
                )}
            </div>

            {/* Sticky Action Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-end space-x-3">
                <button
                    onClick={onClose}
                    className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                    Discard
                </button>
                <button
                    onClick={handleSave}
                    disabled={!title || !projectId || mutation.isPending}
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center disabled:opacity-50 disabled:bg-gray-400"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {mutation.isPending ? 'Saving...' : (task ? 'Save Changes' : 'Create Task')}
                </button>
            </div>
        </Drawer>
    );
};

export default CreateTaskDrawer;
