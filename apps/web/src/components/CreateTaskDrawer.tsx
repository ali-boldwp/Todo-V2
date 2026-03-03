import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Drawer from './Drawer';
import RichTextEditor, { RichTextEditorRef } from './RichTextEditor';
import TaskDetailsDrawer from './TaskDetailsDrawer';
import TaskComments from './TaskComments';
import clsx from 'clsx';
import { getProjects } from '../services/core';
import { createTask, updateTask, uploadAttachment, deleteAttachment, downloadAttachment, startTaskWork, pauseTaskWork, resumeTaskWork, finishTaskWork, approveTaskVerification, rejectTaskVerification, fixTaskBranch } from '../services/task';
import { useAuth } from '../context/AuthContext';
import {
    Flag,
    CheckCircle2,
    Folder,
    GitBranch,
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
    { value: 'under_verification', label: 'Under Verification', color: 'text-violet-600' },
    { value: 'clarification', label: 'Clarification', color: 'text-red-500' },
    { value: 'clarified', label: 'Clarified', color: 'text-emerald-500' },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-700 border-gray-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-100',
    review: 'bg-amber-50 text-amber-700 border-amber-100',
    done: 'bg-green-50 text-green-700 border-green-100',
    under_verification: 'bg-violet-50 text-violet-700 border-violet-100',
    clarification: 'bg-red-50 text-red-700 border-red-100',
    clarified: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const VERIFICATION_LABELS: Record<string, string> = {
    none: 'Not Sent',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
};

const VERIFICATION_BADGE_STYLES: Record<string, string> = {
    none: 'bg-gray-100 text-gray-700 border-gray-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    approved: 'bg-green-50 text-green-700 border-green-100',
    rejected: 'bg-red-50 text-red-700 border-red-100',
};

const slugifyBranchSegment = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30);

const isBranchFixedForTask = (branch: string, taskTitle: string) => {
    if (!branch || !taskTitle) return false;
    const segment = slugifyBranchSegment(taskTitle.trim()) || 'untitled';
    const escapedTitle = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^tasks\\/[^/]+\\/(inprogress|done)\\/${escapedTitle}$`);
    return pattern.test(branch);
};

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
    const [activeWorker, setActiveWorker] = useState<any>(task?.activeWorkerId || null);
    const [githubBranch, setGithubBranch] = useState<string>(task?.githubBranch || '');
    const [verifier, setVerifier] = useState<any>(task?.verifierId || null);
    const [verificationStatus, setVerificationStatus] = useState<string>(task?.verificationStatus || 'none');
    const [verificationComment, setVerificationComment] = useState<string>(task?.verificationComment || '');
    const [lastWorkStartedAt, setLastWorkStartedAt] = useState<string | null>(task?.lastWorkStartedAt || null);
    const [isWorkPaused, setIsWorkPaused] = useState<boolean>(!!task?.isWorkPaused);
    const [baseWorkedSeconds, setBaseWorkedSeconds] = useState<number>(Number(task?.totalWorkedSeconds || 0));
    const [, setTick] = useState(0);
    const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
    const [verificationNotify, setVerificationNotify] = useState<{ name: string; email?: string } | null>(null);

    // Track whether we've just loaded (to avoid auto-saving on initial populate)
    const isInitialized = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<RichTextEditorRef>(null);

    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
        enabled: isOpen,
    });
    const selectedProject = projects?.find((p: any) => p._id === projectId);

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
            setActiveWorker(task.activeWorkerId || null);
            setGithubBranch(task.githubBranch || '');
            setVerifier(task.verifierId || null);
            setVerificationStatus(task.verificationStatus || 'none');
            setVerificationComment(task.verificationComment || '');
            setLastWorkStartedAt(task.lastWorkStartedAt || null);
            setIsWorkPaused(!!task.isWorkPaused);
            setBaseWorkedSeconds(Number(task.totalWorkedSeconds || 0));
        } else {
            setTitle('');
            setStatus('todo');
            setPriority('medium');
            setProjectId(initialProjectId || '');
            setDescription(undefined);
            setNeedsClarification(false);
            setLocalAttachments([]);
            setPendingAttachments([]);
            setActiveWorker(null);
            setGithubBranch('');
            setVerifier(null);
            setVerificationStatus('none');
            setVerificationComment('');
            setLastWorkStartedAt(null);
            setIsWorkPaused(false);
            setBaseWorkedSeconds(0);
        }
        setEditorInstanceKey((k) => k + 1);
        setSaveStatus('idle');
        setUploadError(null);
        // Mark as initialized after a short delay so first render doesn't trigger auto-save
        const t = setTimeout(() => { isInitialized.current = true; }, 1000);
        return () => clearTimeout(t);
    }, [task, initialProjectId, isOpen]);

    useEffect(() => {
        if (!activeWorker || isWorkPaused || !lastWorkStartedAt) return;
        const interval = setInterval(() => setTick((v) => v + 1), 1000);
        return () => clearInterval(interval);
    }, [activeWorker, isWorkPaused, lastWorkStartedAt]);

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
    const scheduleAutoSave = useCallback(async (patch: any) => {
        if (!task || !isInitialized.current) return;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        let finalPatch = { ...patch };

        // If we have an editor, ensure we get the latest data directly from it
        // and override whatever is in the 'description' state to avoid race conditions
        if (editorRef.current) {
            try {
                const latestDescription = await editorRef.current.save();
                finalPatch.description = latestDescription;
            } catch (e) {
                console.error('Failed to save editor content during auto-save', e);
            }
        }

        setSaveStatus('saving');
        debounceTimer.current = setTimeout(() => {
            autoSaveMutation.mutate(finalPatch);
        }, 800);
    }, [task]);

    // Watchers — each field triggers auto-save with the latest full payload
    useEffect(() => {
        scheduleAutoSave({ title, status, priority, projectId, description, needsClarification, type: 'task' });
    }, [title, status, priority, projectId, needsClarification]);

    // Description state update also triggers it
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

    const applyWorkState = (updatedTask: any) => {
        setActiveWorker(updatedTask.activeWorkerId || null);
        setGithubBranch(updatedTask.githubBranch || '');
        setVerifier(updatedTask.verifierId || null);
        setVerificationStatus(updatedTask.verificationStatus || 'none');
        setVerificationComment(updatedTask.verificationComment || '');
        setLastWorkStartedAt(updatedTask.lastWorkStartedAt || null);
        setIsWorkPaused(!!updatedTask.isWorkPaused);
        setBaseWorkedSeconds(Number(updatedTask.totalWorkedSeconds || 0));
        if (updatedTask.status) setStatus(updatedTask.status);
    };

    const startWorkMutation = useMutation({
        mutationFn: () => {
            if (!task?._id) return Promise.reject(new Error('No task selected'));
            return startTaskWork(task._id);
        },
        onSuccess: (updatedTask) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            applyWorkState(updatedTask);
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || 'Failed to start task');
        },
    });

    const pauseWorkMutation = useMutation({
        mutationFn: () => {
            if (!task?._id) return Promise.reject(new Error('No task selected'));
            return pauseTaskWork(task._id);
        },
        onSuccess: (updatedTask) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            applyWorkState(updatedTask);
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || 'Failed to pause task');
        },
    });

    const resumeWorkMutation = useMutation({
        mutationFn: () => {
            if (!task?._id) return Promise.reject(new Error('No task selected'));
            return resumeTaskWork(task._id);
        },
        onSuccess: (updatedTask) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            applyWorkState(updatedTask);
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || 'Failed to resume task');
        },
    });

    const finishWorkMutation = useMutation({
        mutationFn: () => {
            if (!task?._id) return Promise.reject(new Error('No task selected'));
            return finishTaskWork(task._id);
        },
        onSuccess: (updatedTask) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            applyWorkState(updatedTask);
            const assignedVerifier = updatedTask?.verifierId;
            const fullName = assignedVerifier
                ? `${assignedVerifier.firstName || ''} ${assignedVerifier.lastName || ''}`.trim() || assignedVerifier.email || ''
                : '';
            if ((updatedTask?.verificationStatus === 'pending' || updatedTask?.status === 'under_verification') && fullName) {
                setVerificationNotify({
                    name: fullName,
                    email: assignedVerifier?.email || undefined,
                });
            }
        },
        onError: (error: any) => {
            const data = error?.response?.data || {};
            const conflictUrl = data?.pullRequestUrl || data?.compareUrl || data?.resolveUrl;
            const pieces = [
                data?.message || 'Failed to finish task',
                data?.mergeStep ? `Step: ${data.mergeStep}` : '',
                data?.code ? `Code: ${data.code}` : '',
                data?.branch ? `Branch: ${data.branch}` : '',
                data?.details ? `Details: ${data.details}` : '',
                conflictUrl ? `Resolve: ${conflictUrl}` : '',
            ].filter(Boolean);
            alert(pieces.join('\n'));
            if (conflictUrl) {
                const shouldOpen = window.confirm('Open GitHub conflict resolution page now?');
                if (shouldOpen) {
                    window.open(conflictUrl, '_blank', 'noopener,noreferrer');
                }
            }
        },
    });

    const fixBranchMutation = useMutation({
        mutationFn: () => {
            if (!task?._id) return Promise.reject(new Error('No task selected'));
            return fixTaskBranch(task._id);
        },
        onSuccess: (updatedTask) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            applyWorkState(updatedTask);
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || 'Failed to fix task branch');
        },
    });

    const confirmAndFinishTask = () => setIsFinishConfirmOpen(true);

    const approveVerificationMutation = useMutation({
        mutationFn: (comment?: string) => {
            if (!task?._id) return Promise.reject(new Error('No task selected'));
            return approveTaskVerification(task._id, comment);
        },
        onSuccess: (updatedTask) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            applyWorkState(updatedTask);
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || 'Failed to approve task');
        },
    });

    const rejectVerificationMutation = useMutation({
        mutationFn: (comment?: string) => {
            if (!task?._id) return Promise.reject(new Error('No task selected'));
            return rejectTaskVerification(task._id, comment);
        },
        onSuccess: (updatedTask) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            applyWorkState(updatedTask);
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || 'Failed to reject task');
        },
    });

    const runningSeconds = activeWorker && !isWorkPaused && lastWorkStartedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(lastWorkStartedAt).getTime()) / 1000))
        : 0;
    const totalWorkedSeconds = baseWorkedSeconds + runningSeconds;
    const isUnderVerification = verificationStatus === 'pending' || status === 'under_verification';
    const isInProgressWithoutVisibleWorker = status === 'in_progress' && !activeWorker;
    const verifierId = verifier?._id || verifier;
    const canVerifyInDrawer =
        !!task &&
        verificationStatus === 'pending' &&
        (verifierId === user?.id || ['admin', 'manager'].includes(user?.role || ''));
    const hasTaskStarted = Boolean(
        activeWorker ||
        task?.workStartedAt ||
        lastWorkStartedAt ||
        Number(baseWorkedSeconds || 0) > 0
    );
    const isCurrentBranchFixed = Boolean(task?.title && isBranchFixedForTask(githubBranch, task.title));
    const canShowFixBranchButton = Boolean(task && githubBranch && !hasTaskStarted && !isCurrentBranchFixed);
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

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

    const handleAttachmentDownload = async (att: any, idx: number) => {
        if (!task?._id) return;
        try {
            const payload = att?.data
                ? att
                : await downloadAttachment(task._id, idx);
            const link = document.createElement('a');
            link.href = payload?.data?.startsWith?.('data:')
                ? payload.data
                : `data:${payload.mimeType};base64,${payload.data}`;
            link.download = payload.name || att.name || 'attachment';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            alert('Failed to download attachment');
        }
    };

    const handleCreate = async () => {
        if (!title || !projectId) return;

        // Ensure we have the latest description from the editor
        let finalDescription = description;
        if (editorRef.current) {
            finalDescription = await editorRef.current.save();
        }

        createMutation.mutate({
            title,
            status,
            priority,
            projectId,
            description: finalDescription,
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
                                ref={editorRef}
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
                                <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.todo}`}>
                                    {STATUS_OPTIONS.find((opt) => opt.value === status)?.label || status}
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="group flex items-center min-h-[28px] hover:bg-gray-50 rounded-md px-1 transition-colors">
                                <div className="w-24 flex items-center space-x-2 text-[13px] text-gray-500">
                                    <Flag className="w-3.5 h-3.5" />
                                    <span>Priority</span>
                                </div>
                                <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${PRIORITY_OPTIONS.find((opt) => opt.value === priority)?.bg || 'bg-gray-100'} ${PRIORITY_OPTIONS.find((opt) => opt.value === priority)?.color || 'text-gray-700'}`}>
                                    {PRIORITY_OPTIONS.find((opt) => opt.value === priority)?.label || priority}
                                </div>
                            </div>

                            {/* Project */}
                            <div className="group flex items-center min-h-[28px] hover:bg-gray-50 rounded-md px-1 transition-colors">
                                <div className="w-24 flex items-center space-x-2 text-[13px] text-gray-500">
                                    <Folder className="w-3.5 h-3.5" />
                                    <span>Project</span>
                                </div>
                                <div className="text-[13px] font-medium text-gray-900">
                                    {selectedProject?.name || 'Not set'}
                                </div>
                            </div>

                            {githubBranch && (
                                <div className="group flex items-center min-h-[28px] hover:bg-gray-50 rounded-md px-1 transition-colors">
                                    <div className="w-24 flex items-center space-x-2 text-[13px] text-gray-500">
                                        <GitBranch className="w-3.5 h-3.5" />
                                        <span>Branch</span>
                                    </div>
                                    <code
                                        className="text-[12px] font-mono bg-gray-100 text-indigo-700 px-2 py-0.5 rounded cursor-pointer hover:bg-indigo-50 transition-colors"
                                        onClick={() => navigator.clipboard.writeText(githubBranch)}
                                        title="Click to copy branch name"
                                    >
                                        {githubBranch}
                                    </code>
                                </div>
                            )}
                            {canShowFixBranchButton && (
                                <div className="flex items-center min-h-[28px] px-1">
                                    <button
                                        onClick={() => fixBranchMutation.mutate()}
                                        disabled={fixBranchMutation.isPending}
                                        className="px-3 py-1 text-xs font-semibold rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                                    >
                                        {fixBranchMutation.isPending ? 'Fixing...' : 'Fix Branch'}
                                    </button>
                                    <span className="ml-2 text-[11px] text-gray-500">
                                        Required for the new merge flow.
                                    </span>
                                </div>
                            )}

                            {task && (
                                <div className="group flex items-center min-h-[28px] hover:bg-gray-50 rounded-md px-1 transition-colors">
                                    <div className="w-24 flex items-center space-x-2 text-[13px] text-gray-500">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Tester</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-medium text-gray-900">
                                            {verifier ? `${verifier.firstName || ''} ${verifier.lastName || ''}`.trim() || verifier.email : 'Not assigned'}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${VERIFICATION_BADGE_STYLES[verificationStatus] || VERIFICATION_BADGE_STYLES.none}`}>
                                            {VERIFICATION_LABELS[verificationStatus] || verificationStatus}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {task && verificationStatus === 'rejected' && (
                                <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">Rejection Note</p>
                                    <p className="mt-1 text-xs text-red-800">
                                        {verificationComment?.trim()
                                            ? verificationComment
                                            : 'Task was rejected without a written reason.'}
                                    </p>
                                </div>
                            )}
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
                                                <button
                                                    type="button"
                                                    onClick={() => handleAttachmentDownload(att, idx)}
                                                    className="text-[13px] font-medium text-gray-700 hover:text-indigo-600 truncate transition-colors text-left"
                                                >
                                                    {att.name}
                                                </button>
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
                        <div className="flex items-center space-x-2">
                            {canVerifyInDrawer && (
                                <>
                                    <button
                                        onClick={() => {
                                            const comment = window.prompt('Approval note (optional):') || undefined;
                                            approveVerificationMutation.mutate(comment);
                                        }}
                                        disabled={approveVerificationMutation.isPending}
                                        className="px-4 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50 rounded-md transition-all disabled:opacity-50"
                                    >
                                        {approveVerificationMutation.isPending ? 'Approving...' : 'Approve'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const comment = window.prompt('Rejection reason (optional):') || undefined;
                                            rejectVerificationMutation.mutate(comment);
                                        }}
                                        disabled={rejectVerificationMutation.isPending}
                                        className="px-4 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 rounded-md transition-all disabled:opacity-50"
                                    >
                                        {rejectVerificationMutation.isPending ? 'Rejecting...' : 'Reject'}
                                    </button>
                                </>
                            )}
                            {['admin', 'manager', 'member'].includes(user?.role || '') && (
                                <>
                                    <span className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 rounded-md">
                                        Time: {formatDuration(totalWorkedSeconds)}
                                    </span>
                                    {activeWorker?._id === user?.id ? (
                                        <>
                                            {isWorkPaused ? (
                                                <button
                                                    onClick={() => resumeWorkMutation.mutate()}
                                                    disabled={resumeWorkMutation.isPending}
                                                    className="px-4 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50 rounded-md transition-all disabled:opacity-50"
                                                >
                                                    {resumeWorkMutation.isPending ? 'Resuming...' : 'Resume'}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => pauseWorkMutation.mutate()}
                                                    disabled={pauseWorkMutation.isPending}
                                                    className="px-4 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 rounded-md transition-all disabled:opacity-50"
                                                >
                                                    {pauseWorkMutation.isPending ? 'Pausing...' : 'Pause'}
                                                </button>
                                            )}
                                            <button
                                                onClick={confirmAndFinishTask}
                                                disabled={finishWorkMutation.isPending}
                                                className="px-4 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 rounded-md transition-all disabled:opacity-50"
                                            >
                                                {finishWorkMutation.isPending ? 'Finishing...' : 'Finish'}
                                            </button>
                                        </>
                                    ) : !activeWorker ? (
                                        isUnderVerification ? (
                                            <span className="px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 rounded-md">
                                                Under Verification
                                            </span>
                                        ) : isInProgressWithoutVisibleWorker ? (
                                            <span className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md">
                                                In Progress
                                            </span>
                                        ) : (
                                        <button
                                            onClick={() => startWorkMutation.mutate()}
                                            disabled={startWorkMutation.isPending}
                                            className="px-4 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50 rounded-md transition-all disabled:opacity-50"
                                        >
                                            {startWorkMutation.isPending ? 'Starting...' : 'Start'}
                                        </button>
                                        )
                                    ) : (
                                        <span className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 rounded-md">
                                            {isWorkPaused ? 'Paused by' : 'Working:'} {activeWorker.firstName} {activeWorker.lastName}
                                        </span>
                                    )}
                                </>
                            )}
                            <button
                                onClick={onClose}
                                className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-md transition-all"
                            >
                                Close
                            </button>
                        </div>
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

            {isFinishConfirmOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Before Finishing Task</h3>
                        <p className="text-sm text-gray-600 mt-2">
                            Confirm that you have pushed your latest code to GitHub.
                        </p>
                        {githubBranch && (
                            <div className="mt-3 px-3 py-2 rounded-md bg-indigo-50 border border-indigo-100 text-xs text-indigo-800 font-medium">
                                Branch: <span className="font-mono">{githubBranch}</span>
                            </div>
                        )}
                        <div className="mt-5 flex gap-2 justify-end">
                            <button
                                onClick={() => setIsFinishConfirmOpen(false)}
                                className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setIsFinishConfirmOpen(false);
                                    finishWorkMutation.mutate();
                                }}
                                disabled={finishWorkMutation.isPending}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {finishWorkMutation.isPending ? 'Finishing...' : 'Yes, Finish Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {verificationNotify && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl border border-amber-200">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900">Action Required</h3>
                                <p className="text-sm text-gray-700 mt-1">
                                    Inform <span className="font-semibold">{verificationNotify.name}</span> about verification for this task.
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Task is now under verification and waiting for tester decision.
                                </p>
                            </div>
                        </div>
                        {verificationNotify.email && (
                            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between">
                                <span className="text-xs text-gray-700">{verificationNotify.email}</span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(verificationNotify.email || '')}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                >
                                    Copy Email
                                </button>
                            </div>
                        )}
                        <p className="text-[11px] text-gray-400 mt-3">
                            Suggested message: "Please verify this task now."
                        </p>
                        <div className="mt-5 flex justify-end">
                            <button
                                onClick={() => setVerificationNotify(null)}
                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Drawer>
    );
};

export default CreateTaskDrawer;
