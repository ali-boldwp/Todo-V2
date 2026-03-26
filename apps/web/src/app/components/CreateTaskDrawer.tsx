import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, Loader2 } from 'lucide-react';
import { createTask, updateTask } from '../../services/task';
import { getTeamMembers } from '../../services/team';

interface CreateTaskDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    task?: any; // if provided, we're editing
    initialProjectId?: string;
}

const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;
const STATUS_OPTIONS = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'under_verification', label: 'Under Verification' },
    { value: 'clarification', label: 'Clarification' },
    { value: 'done', label: 'Done' },
] as const;

export function CreateTaskDrawer({ isOpen, onClose, task, initialProjectId }: CreateTaskDrawerProps) {
    const queryClient = useQueryClient();
    const isEditing = !!task;

    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<string>('medium');
    const [status, setStatus] = useState<string>('todo');
    const [assigneeId, setAssigneeId] = useState('');
    const [verifierId, setVerifierId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [estimatedHours, setEstimatedHours] = useState('');

    const { data: teamMembers = [] } = useQuery({
        queryKey: ['teamMembers'],
        queryFn: getTeamMembers,
        enabled: isOpen,
    });

    // Populate form when editing
    useEffect(() => {
        if (task) {
            setTitle(task.title || '');
            setPriority(task.priority || 'medium');
            setStatus(task.status || 'todo');
            setAssigneeId(task.assigneeId?._id || task.assigneeId || '');
            setVerifierId(task.verifierId?._id || task.verifierId || '');
            setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
            setEstimatedHours(task.estimatedHours ? String(task.estimatedHours) : '');
        } else {
            setTitle('');
            setPriority('medium');
            setStatus('todo');
            setAssigneeId('');
            setVerifierId('');
            setDueDate('');
            setEstimatedHours('');
        }
    }, [task, isOpen]);

    const createMutation = useMutation({
        mutationFn: (data: any) => createTask(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', initialProjectId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            onClose();
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => updateTask(task._id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', initialProjectId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            onClose();
        },
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const payload: any = {
            title: title.trim(),
            priority,
            status,
            projectId: initialProjectId,
        };
        if (assigneeId) payload.assigneeId = assigneeId;
        if (verifierId) payload.verifierId = verifierId;
        if (dueDate) payload.dueDate = dueDate;
        if (estimatedHours) payload.estimatedHours = Number(estimatedHours);

        if (isEditing) {
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-gray-100 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest">
                        {isEditing ? 'Edit Task' : 'New Task'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400 hover:text-gray-900"
                    >
                        <X size={18} strokeWidth={2} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Fix login button styling"
                                required
                                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-colors"
                            />
                        </div>

                        {/* Priority + Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                    Priority
                                </label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 bg-white capitalize"
                                >
                                    {PRIORITY_OPTIONS.map((p) => (
                                        <option key={p} value={p} className="capitalize">{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                    Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 bg-white"
                                >
                                    {STATUS_OPTIONS.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Assignee + Verifier */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                    Assignee
                                </label>
                                <select
                                    value={assigneeId}
                                    onChange={(e) => setAssigneeId(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 bg-white"
                                >
                                    <option value="">Unassigned</option>
                                    {teamMembers.map((m: any) => (
                                        <option key={m._id} value={m._id}>
                                            {m.firstName} {m.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                    Verifier
                                </label>
                                <select
                                    value={verifierId}
                                    onChange={(e) => setVerifierId(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 bg-white"
                                >
                                    <option value="">None</option>
                                    {teamMembers
                                        .filter((m: any) => m.canVerifyTasks || m.role === 'admin' || m.role === 'manager')
                                        .map((m: any) => (
                                            <option key={m._id} value={m._id}>
                                                {m.firstName} {m.lastName}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {/* Due Date + Estimated Hours */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                    Est. Hours
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={estimatedHours}
                                    onChange={(e) => setEstimatedHours(e.target.value)}
                                    placeholder="e.g. 4"
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                />
                            </div>
                        </div>

                        {/* Error display */}
                        {(createMutation.error || updateMutation.error) && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {(createMutation.error as any)?.response?.data?.message
                                    || (updateMutation.error as any)?.response?.data?.message
                                    || 'Something went wrong. Please try again.'}
                            </p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !title.trim()}
                            className="h-9 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {isPending
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                : <><Save className="w-4 h-4" /> {isEditing ? 'Save Changes' : 'Create Task'}</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateTaskDrawer;