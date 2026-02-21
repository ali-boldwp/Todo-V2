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
    Info,
    Link as LinkIcon,
    Paperclip,
    Plus
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
            title={task ? `TASK-${task._id.slice(-4).toUpperCase()}` : 'NEW TASK'}
            size="2xl"
        >
            <div className="flex flex-col h-full">
                <div className="space-y-6 pb-20 px-4">
                    {/* Header: Title and Description combined like an article */}
                    <div className="space-y-4">
                        <textarea
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Task title"
                            className="w-full text-4xl font-extrabold border-none focus:ring-0 placeholder-gray-100 p-0 resize-none leading-tight tracking-tight text-gray-900"
                            rows={1}
                        />

                        {/* Description Editor Integrated directly */}
                        <div className="min-h-[150px] -mx-1 text-gray-700">
                            <RichTextEditor
                                holder={task ? `editor-${task._id}` : 'new-task-editor'}
                                data={description}
                                onChange={setDescription}
                            />
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap gap-2 py-4 border-y border-gray-50">
                        <button className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md text-sm font-medium transition-all group">
                            <Plus className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                            <span>Add sub-task</span>
                        </button>
                        <button className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md text-sm font-medium transition-all group">
                            <LinkIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                            <span>Add relation</span>
                        </button>
                        <button className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md text-sm font-medium transition-all group">
                            <Paperclip className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                            <span>Attach</span>
                        </button>
                    </div>

                    {/* Properties Grid */}
                    <div className="space-y-4 py-4">
                        <h4 className="text-sm font-bold text-gray-900 px-1">Properties</h4>

                        <div className="grid grid-cols-1 gap-y-3">
                            {/* Status */}
                            <div className="group flex items-center min-h-[32px] hover:bg-gray-50 rounded-md px-1 transition-colors">
                                <div className="w-32 flex items-center space-x-2 text-sm text-gray-500">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Status</span>
                                </div>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="flex-1 bg-transparent border-none p-0 text-sm font-medium text-gray-900 focus:ring-0 cursor-pointer"
                                >
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Priority */}
                            <div className="group flex items-center min-h-[32px] hover:bg-gray-50 rounded-md px-1 transition-colors">
                                <div className="w-32 flex items-center space-x-2 text-sm text-gray-500">
                                    <Flag className="w-4 h-4" />
                                    <span>Priority</span>
                                </div>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="flex-1 bg-transparent border-none p-0 text-sm font-medium text-gray-900 focus:ring-0 cursor-pointer"
                                >
                                    {PRIORITY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Project */}
                            <div className="group flex items-center min-h-[32px] hover:bg-gray-50 rounded-md px-1 transition-colors">
                                <div className="w-32 flex items-center space-x-2 text-sm text-gray-500">
                                    <Folder className="w-4 h-4" />
                                    <span>Project</span>
                                </div>
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    className="flex-1 bg-transparent border-none p-0 text-sm font-medium text-gray-900 focus:ring-0 cursor-pointer"
                                >
                                    <option value="" disabled>Select Project</option>
                                    {projects?.map((p: any) => (
                                        <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Clarification */}
                            <div className="group flex items-center min-h-[32px] hover:bg-gray-50 rounded-md px-1 transition-colors">
                                <div className="w-32 flex items-center space-x-2 text-sm text-gray-500">
                                    <Info className="w-4 h-4" />
                                    <span>Clarification</span>
                                </div>
                                <div className="flex-1 flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={needsClarification}
                                        onChange={(e) => setNeedsClarification(e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span className="ml-2 text-xs text-gray-400">Needs attention</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Clarification Banner */}
                    {needsClarification && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start space-x-3 mb-4">
                            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                            <div className="text-xs text-amber-800">
                                <p className="font-bold">Clarification Required</p>
                                <p className="mt-0.5">Please provide more details in the comments section below.</p>
                            </div>
                        </div>
                    )}

                    {/* Activity Section */}
                    {task && (
                        <div className="space-y-6 pt-8 border-t border-gray-50">
                            <h4 className="text-sm font-bold text-gray-900 px-1">Activity</h4>
                            <TaskComments taskId={task._id} />
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex justify-between items-center z-20">
                <div className="text-[10px] text-gray-400 font-medium px-2">
                    {task ? `Updated ${new Date(task.updatedAt).toLocaleDateString()}` : 'Drafting new task'}
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-md transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!title || !projectId || mutation.isPending}
                        className="px-4 py-1.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-black transition-all flex items-center disabled:opacity-30"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {mutation.isPending ? 'Saving...' : (task ? 'Save' : 'Create')}
                    </button>
                </div>
            </div>
        </Drawer>
    );
};

export default CreateTaskDrawer;
