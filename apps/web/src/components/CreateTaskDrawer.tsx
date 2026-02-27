import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Drawer from './Drawer';
import RichTextEditor from './RichTextEditor';
import TaskDetailsDrawer from './TaskDetailsDrawer';
import TaskComments from './TaskComments';
import clsx from 'clsx';
import { getProjects } from '../services/core';
import { createTask, updateTask, uploadAttachment, deleteAttachment } from '../services/task';
import { useAuth } from '../context/AuthContext';
import {
    Flag,
    CheckCircle2,
    Folder,
    Save,
    AlertCircle,
    Info,
    Paperclip,
    Check,
    Loader2,
    Trash2,
    FileText,
} from 'lucide-react';
import { OutputData } from '@editorjs/editorjs';

interface CreateTaskDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    task?: any; // If provided, we are in edit mode
    initialProjectId?: string;
}

interface PendingAttachment {
    id: string;
    file: File;
}

const normalizeDescription = (value: any): OutputData | undefined => {
    if (!value) return undefined;
    if (typeof value === 'object' && Array.isArray(value.blocks)) {
        return value as OutputData;
    }
    if (typeof value === 'string' && value.trim()) {
        return {
            time: Date.now(),
            blocks: [{ type: 'paragraph', data: { text: value } }],
            version: '2.0.0',
        };
    }
    return undefined;
};

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
    { value: 'clarification', label: 'Clarification', color: 'text-red-500' },
    { value: 'clarified', label: 'Clarified', color: 'text-emerald-500' },
];

const CreateTaskDrawer: React.FC<CreateTaskDrawerProps> = ({ isOpen, onClose, task, initialProjectId }) => {
    const { user } = useAuth();
    const canManageClarification = ['admin', 'manager', 'member'].includes(user?.role || '');
    const queryClient = useQueryClient();
    const [title, setTitle] = useState(task?.title || '');
    const [status, setStatus] = useState(task?.status || 'todo');
    const [priority, setPriority] = useState(task?.priority || 'medium');
    const [projectId, setProjectId] = useState(task?.projectId || initialProjectId || '');
    const [description, setDescription] = useState<OutputData | undefined>(normalizeDescription(task?.description));
    const [needsClarification, setNeedsClarification] = useState(task?.needsClarification || false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [localAttachments, setLocalAttachments] = useState<any[]>(task?.attachments || []);
    const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
    const [editorInstanceKey, setEditorInstanceKey] = useState(0);
    const [isClarificationDrawerOpen, setIsClarificationDrawerOpen] = useState(false);

    // Track whether we've just loaded (to avoid auto-saving on initial populate)
    const isInitialized = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
        enabled: isOpen,
    });

    useEffect(() => {
        isInitialized.current = false;
        if (task) {
            setTitle(task.title);
            setStatus(task.status);
            setPriority(task.priority);
            setProjectId(task.projectId);
            setDescription(normalizeDescription(task.description));
            setNeedsClarification(task.needsClarification || false);
            setLocalAttachments(task.attachments || []);
            setPendingAttachments([]);
        } else {
            setTitle('');
            setStatus('todo');
            setPriority('medium');
            setProjectId(initialProjectId || '');
            setDescription(undefined);
            setNeedsClarification(false);
            setLocalAttachments([]);
            setPendingAttachments([]);
        }
        setEditorInstanceKey((k) => k + 1);
        setSaveStatus('idle');
        setUploadError(null);
        // Mark as initialized after a short delay so first render doesn't trigger auto-save
        const t = setTimeout(() => { isInitialized.current = true; }, 1000);
        return () => clearTimeout(t);
    }, [task, initialProjectId, isOpen]);

    // --- Create mutation (manual save, closes drawer) ---
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const createdTask = await createTask(data);
            if (pendingAttachments.length > 0) {
                await Promise.allSettled(
                    pendingAttachments.map((att) => uploadAttachment(createdTask._id, att.file))
                );
            }
            return createdTask;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            onClose();
        },
    });

    // --- Auto-save mutation (edit mode, stays open) ---
    const autoSaveMutation = useMutation({
        mutationFn: (data: any) => updateTask(task._id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setSaveStatus('saved');
            // Reset back to idle after 2s
            setTimeout(() => setSaveStatus('idle'), 2000);
        },
        onError: () => setSaveStatus('idle'),
    });

    // Debounced auto-save — only fires when editing an existing task
    const scheduleAutoSave = useCallback((patch: object) => {
        if (!task || !isInitialized.current) return;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        setSaveStatus('saving');
        debounceTimer.current = setTimeout(() => {
            autoSaveMutation.mutate(patch);
        }, 800);
    }, [task]);

    // Watchers — each field triggers auto-save with the latest full payload
    useEffect(() => {
        scheduleAutoSave({ title, status, priority, projectId, description, needsClarification, type: 'task' });
    }, [title, status, priority, projectId, needsClarification]);

    // Description has its own watcher with a slightly longer debounce (handled via scheduleAutoSave)
    useEffect(() => {
        scheduleAutoSave({ title, status, priority, projectId, description, needsClarification, type: 'task' });
    }, [description]);

    // --- Attachment upload mutation ---
    const attachMutation = useMutation({
        mutationFn: (file: File) => {
            if (!task?._id) return Promise.reject('No task id');
            return uploadAttachment(task._id, file);
        },
        onSuccess: (updatedTask) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setLocalAttachments(updatedTask.attachments || []);
            setUploadError(null);
        },
        onError: (err: any) => {
            setUploadError(err?.response?.data?.message || 'Upload failed');
        },
    });

    // --- Attachment delete mutation ---
    const detachMutation = useMutation({
        mutationFn: (index: number) => {
            if (!task?._id) return Promise.reject('No task id');
            return deleteAttachment(task._id, index);
        },
        onSuccess: (updatedTask) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setLocalAttachments(updatedTask.attachments || []);
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError(null);
        if (!task?._id) {
            setPendingAttachments((prev) => [
                ...prev,
                {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    file,
                },
            ]);
            e.target.value = '';
            return;
        }
        attachMutation.mutate(file);
        // reset so same file can be re-selected
        e.target.value = '';
    };

    const handleCreate = () => {
        if (!title || !projectId) return;
        createMutation.mutate({
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
            title={task ? `TASK-${task._id.slice(-4).toUpperCase()}` : ''}
            size="2xl"
        >
            <div className="flex flex-col h-full bg-white">
                <div className="pb-20">
                    {/* Header: Title and Description combined */}
                    <div className="space-y-1">
                        <textarea
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            placeholder="Task title"
                            className="w-full text-2xl font-bold border-none focus:ring-0 focus:outline-none placeholder-gray-300 p-0 resize-none leading-none tracking-tight text-gray-900 overflow-hidden bg-transparent m-0 h-auto"
                            rows={1}
                            onFocus={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                        />

                        <div className="min-h-0 text-gray-700 leading-none py-0 my-0">
                            <RichTextEditor
                                key={`${task?._id || 'new-task'}-${editorInstanceKey}`}
                                holder={task ? `editor-${task._id}-${editorInstanceKey}` : `new-task-editor-${editorInstanceKey}`}
                                data={description}
                                onChange={setDescription}
                                placeholder="Add description..."
                            />
                        </div>
                    </div>

                    {/* Action Bar — Attach only */}
                    <div className="flex flex-wrap gap-2 py-1 border-y border-gray-50 mt-1">
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={attachMutation.isPending}
                            className="flex items-center space-x-2 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md text-[13px] font-medium transition-all group disabled:opacity-50"
                        >
                            {attachMutation.isPending
                                ? <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                                : <Paperclip className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                            }
                            <span>{attachMutation.isPending ? 'Uploading…' : 'Attach'}</span>
                        </button>

                        {uploadError && (
                            <span className="text-[12px] text-red-500 self-center">{uploadError}</span>
                        )}

                        <div className="flex-1" />

                        <button
                            onClick={() => setIsClarificationDrawerOpen(true)}
                            disabled={!task || !canManageClarification}
                            className={clsx(
                                "flex items-center space-x-2 px-3 py-1.5 rounded-md text-[13px] font-bold transition-all shadow-sm",
                                task?.status === 'clarification' || needsClarification
                                    ? "bg-red-600 text-white hover:bg-red-700 shadow-red-100"
                                    : "bg-gray-50 text-red-500 hover:bg-red-50 border border-transparent"
                            )}
                        >
                            <Info className={clsx("w-3.5 h-3.5", task?.status === 'clarification' || needsClarification ? "text-white" : "text-red-400")} />
                            <span>{task?.status === 'clarification' || needsClarification ? 'Clarification Open' : 'Clarification Request'}</span>
                        </button>
                    </div>

                    {/* Properties Grid */}
                    <div className="space-y-1 py-1">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">Properties</h4>

                        <div className="grid grid-cols-1 gap-y-1">
                            {/* Status */}
                            <div className="group flex items-center min-h-[28px] hover:bg-gray-50 rounded-md px-1 transition-colors">
                                <div className="w-24 flex items-center space-x-2 text-[13px] text-gray-500">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Status</span>
                                </div>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="flex-1 bg-transparent border-none p-0 text-[13px] font-medium text-gray-900 focus:ring-0 cursor-pointer"
                                >
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Priority */}
                            <div className="group flex items-center min-h-[28px] hover:bg-gray-50 rounded-md px-1 transition-colors">
                                <div className="w-24 flex items-center space-x-2 text-[13px] text-gray-500">
                                    <Flag className="w-3.5 h-3.5" />
                                    <span>Priority</span>
                                </div>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="flex-1 bg-transparent border-none p-0 text-[13px] font-medium text-gray-900 focus:ring-0 cursor-pointer"
                                >
                                    {PRIORITY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Project */}
                            <div className="group flex items-center min-h-[28px] hover:bg-gray-50 rounded-md px-1 transition-colors">
                                <div className="w-24 flex items-center space-x-2 text-[13px] text-gray-500">
                                    <Folder className="w-3.5 h-3.5" />
                                    <span>Project</span>
                                </div>
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    className="flex-1 bg-transparent border-none p-0 text-[13px] font-medium text-gray-900 focus:ring-0 cursor-pointer"
                                >
                                    <option value="" disabled>Select Project</option>
                                    {projects?.map((p: any) => (
                                        <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Attachments List */}
                    {(task ? localAttachments.length > 0 : pendingAttachments.length > 0) && (
                        <div className="space-y-1 mt-4">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">Attachments</h4>
                            <div className="flex flex-col gap-1">
                                {task ? (
                                    localAttachments.map((att: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 group"
                                        >
                                            <div className="flex items-center space-x-2 min-w-0">
                                                <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                                <a
                                                    href={`data:${att.mimeType};base64,${att.data}`}
                                                    download={att.name}
                                                    className="text-[13px] font-medium text-gray-700 hover:text-indigo-600 truncate transition-colors"
                                                >
                                                    {att.name}
                                                </a>
                                                <span className="text-[11px] text-gray-400 flex-shrink-0">
                                                    {att.size < 1024 * 1024
                                                        ? `${(att.size / 1024).toFixed(1)} KB`
                                                        : `${(att.size / 1024 / 1024).toFixed(1)} MB`}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => detachMutation.mutate(idx)}
                                                disabled={detachMutation.isPending}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-all"
                                                title="Remove attachment"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    pendingAttachments.map((att) => (
                                        <div
                                            key={att.id}
                                            className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 group"
                                        >
                                            <div className="flex items-center space-x-2 min-w-0">
                                                <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                                <span className="text-[13px] font-medium text-gray-700 truncate">
                                                    {att.file.name}
                                                </span>
                                                <span className="text-[11px] text-gray-400 flex-shrink-0">
                                                    {att.file.size < 1024 * 1024
                                                        ? `${(att.file.size / 1024).toFixed(1)} KB`
                                                        : `${(att.file.size / 1024 / 1024).toFixed(1)} MB`}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setPendingAttachments((prev) => prev.filter((x) => x.id !== att.id))}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-all"
                                                title="Remove attachment"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            {!task && pendingAttachments.length > 0 && (
                                <p className="text-[11px] text-gray-500 px-1">Files will upload when you click Create.</p>
                            )}
                        </div>
                    )}
                    {needsClarification && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 flex items-start space-x-3">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="text-[12px] text-red-800">
                                <p className="font-bold">Clarification Requested</p>
                                <p className="mt-0.5 opacity-90">Please provide more details in the comments section below.</p>
                            </div>
                        </div>
                    )}

                    {/* General task comments */}
                    {task && (
                        <div className="space-y-4 pt-6 mt-8 border-t border-gray-50">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">Comments</h4>
                            <TaskComments taskId={task._id} type="general" />
                        </div>
                    )}

                </div>
            </div>

            {task && (
                <TaskDetailsDrawer
                    isOpen={isClarificationDrawerOpen}
                    onClose={() => setIsClarificationDrawerOpen(false)}
                    task={task}
                />
            )}

            {/* Sticky Action Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex justify-between items-center z-20">
                {task ? (
                    // ── Edit mode: auto-save status indicator ──
                    <>
                        <div className="flex items-center space-x-2 px-2">
                            {saveStatus === 'saving' && (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                                    <span className="text-[11px] text-gray-400 font-medium">Saving…</span>
                                </>
                            )}
                            {saveStatus === 'saved' && (
                                <>
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                    <span className="text-[11px] text-green-600 font-medium">Saved</span>
                                </>
                            )}
                            {saveStatus === 'idle' && (
                                <span className="text-[10px] text-gray-400 font-medium">
                                    Auto-saved · {new Date(task.updatedAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-md transition-all"
                        >
                            Close
                        </button>
                    </>
                ) : (
                    // ── Create mode: Cancel + Create button ──
                    <>
                        <div className="text-[10px] text-gray-400 font-medium px-2">Drafting new task</div>
                        <div className="flex space-x-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-md transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!title || !projectId || createMutation.isPending}
                                className="px-4 py-1.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-black transition-all flex items-center disabled:opacity-30"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {createMutation.isPending ? 'Creating…' : 'Create'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Drawer>
    );
};

export default CreateTaskDrawer;
