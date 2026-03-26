import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTasks, updateTask } from '../../services/task';
import { useAuth } from '../../context/AuthContext';
import CreateTaskDrawer from '../components/CreateTaskDrawer';
import { Plus, Search, Play, CheckCircle2, Pencil } from 'lucide-react';

const PRIORITY_ORDER = ['high', 'medium', 'low'] as const;

const PRIORITY_STYLES: Record<string, string> = {
    high: 'border-red-100 bg-red-50 text-red-700',
    medium: 'border-amber-100 bg-amber-50 text-amber-700',
    low: 'border-emerald-100 bg-emerald-50 text-emerald-700',
};

const STATUS_LABELS: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    under_verification: 'Under Verification',
    clarification: 'Clarification',
    clarified: 'Clarified',
    done: 'Done',
};

export function ProjectBacklogPage() {
    const { id: projectId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const canEdit = ['admin', 'manager', 'member'].includes(user?.role || '');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: () => getTasks(projectId!),
    });

    const taskUpdateMutation = useMutation({
        mutationFn: ({ taskId, patch }: { taskId: string; patch: any }) => updateTask(taskId, patch),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
    });

    const backlogTasks = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return tasks.filter((task: any) => {
            if (task.status === 'done') return false;
            if (!q) return true;
            return task.title?.toLowerCase().includes(q);
        });
    }, [tasks, searchTerm]);

    const sections = useMemo(() => {
        const grouped: Record<string, any[]> = { high: [], medium: [], low: [] };
        for (const task of backlogTasks) {
            const key = PRIORITY_ORDER.includes(task.priority) ? task.priority : 'medium';
            grouped[key].push(task);
        }
        return PRIORITY_ORDER.map((priority) => ({ priority, tasks: grouped[priority] || [] }));
    }, [backlogTasks]);

    const openCreate = () => {
        setSelectedTask(null);
        setIsCreateDrawerOpen(true);
    };

    const openEdit = (task: any) => {
        setSelectedTask(task);
        setIsCreateDrawerOpen(true);
    };

    if (isLoading) return <div className="p-8 text-gray-500">Loading backlog...</div>;

    return (
        <div className="p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white min-h-full">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Project Backlog</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {backlogTasks.length} open task{backlogTasks.length === 1 ? '' : 's'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-9 w-56 border border-slate-200 rounded-lg px-3 flex items-center gap-2 focus-within:border-indigo-400">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search backlog..."
                                className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
                            />
                        </div>
                        {canEdit && (
                            <button
                                onClick={openCreate}
                                className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 flex items-center gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                Add Task
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {sections.map((section) => (
                    <div key={section.priority} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase border ${PRIORITY_STYLES[section.priority]}`}>
                                {section.priority}
                            </span>
                            <span className="text-xs text-slate-500">{section.tasks.length}</span>
                        </div>

                        {section.tasks.length === 0 ? (
                            <p className="text-sm text-slate-400">No tasks.</p>
                        ) : (
                            <div className="space-y-2">
                                {section.tasks.map((task: any) => (
                                    <div key={task._id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                            <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                                                {STATUS_LABELS[task.status] || task.status}
                                            </span>
                                            {task.dueDate && (
                                                <span className="text-slate-500">
                                                    Due {new Date(task.dueDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            {canEdit && task.status !== 'in_progress' && (
                                                <button
                                                    onClick={() => taskUpdateMutation.mutate({ taskId: task._id, patch: { status: 'in_progress' } })}
                                                    className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center gap-1"
                                                >
                                                    <Play className="w-3.5 h-3.5" />
                                                    Start
                                                </button>
                                            )}
                                            {canEdit && (
                                                <button
                                                    onClick={() => taskUpdateMutation.mutate({ taskId: task._id, patch: { status: 'done' } })}
                                                    className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 flex items-center gap-1"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Done
                                                </button>
                                            )}
                                            {canEdit && (
                                                <button
                                                    onClick={() => openEdit(task)}
                                                    className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 flex items-center gap-1"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <CreateTaskDrawer
                isOpen={isCreateDrawerOpen}
                onClose={() => {
                    setIsCreateDrawerOpen(false);
                    setSelectedTask(null);
                }}
                task={selectedTask}
                initialProjectId={projectId}
            />
        </div>
    );
}