import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTasks, deleteTask } from '../services/task';
import CreateTaskDrawer from '../components/CreateTaskDrawer';
import { useAuth } from '../context/AuthContext';
import {
    Plus,
    Search,
    ArrowUp,
    ArrowDown,
    Check,
    Pencil,
    Trash2,
    Eye,
    ChevronDown,
} from 'lucide-react';

const STATUS_LABELS: any = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    under_verification: 'Under Verification',
    clarification: 'Clarification',
    clarified: 'Clarified',
};

const SECTION_ORDER = ['todo', 'in_progress', 'under_verification', 'review', 'clarification', 'clarified', 'done'];

const ProjectTasks: React.FC = () => {
    const { user } = useAuth();
    const canDeleteTask = ['admin', 'manager', 'member'].includes(user?.role || '');
    const { id: projectId } = useParams<{ id: string }>();
    const queryClient = useQueryClient();

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: () => getTasks(projectId!),
    });

    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteTask(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
    });

    const filteredTasks = useMemo(
        () => tasks.filter((task: any) => task.title.toLowerCase().includes(searchTerm.toLowerCase())),
        [tasks, searchTerm]
    );

    const sections = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        for (const task of filteredTasks) {
            const key = task.status || 'todo';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(task);
        }
        const orderedKeys = [...SECTION_ORDER, ...Object.keys(grouped).filter((k) => !SECTION_ORDER.includes(k))].filter((k, idx, arr) => arr.indexOf(k) === idx && grouped[k]?.length);
        return orderedKeys.map((key) => ({ key, label: STATUS_LABELS[key] || key, tasks: grouped[key] || [] }));
    }, [filteredTasks]);

    const remainingCount = filteredTasks.filter((t: any) => t.status !== 'done').length;

    const handleOpenCreate = () => {
        setSelectedTask(null);
        setIsCreateDrawerOpen(true);
    };

    const handleOpenEdit = (task: any) => {
        setSelectedTask(task);
        setIsCreateDrawerOpen(true);
    };

    const priorityIcon = (priority: string) => {
        if (priority === 'high') return <ArrowUp className="w-4 h-4 text-red-500" strokeWidth={2.2} />;
        if (priority === 'medium') return <ArrowUp className="w-4 h-4 text-orange-500" strokeWidth={2.2} />;
        return <ArrowDown className="w-4 h-4 text-green-500" strokeWidth={2.2} />;
    };

    if (isLoading) return <div className="p-8 text-gray-500">Loading tasks...</div>;

    return (
        <div className="h-full bg-white">
            <div className="px-7 pt-5 pb-3 border-b border-gray-100 flex items-end justify-between">
                <div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1.5">
                        <span>Home</span>
                        <span>{'>'}</span>
                        <span>Projects</span>
                        <span>{'>'}</span>
                        <span className="text-gray-600">Tasks</span>
                    </div>
                    <h2 className="text-[22px] font-extrabold text-gray-900 tracking-[-0.4px]">Tasks</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{remainingCount} remaining tasks</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="h-8 w-52 border border-gray-200 rounded-md px-2.5 flex items-center gap-2 focus-within:border-[#4f6ef7] focus-within:ring-2 focus-within:ring-[#4f6ef7]/10 transition-all">
                        <Search className="w-3.5 h-3.5 text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search"
                            className="w-full bg-transparent outline-none text-[12.5px] text-gray-700 placeholder:text-gray-400"
                        />
                    </div>

                    <button className="h-8 px-3 rounded-md bg-gray-900 text-white text-[12.5px] font-semibold hover:bg-gray-700 transition-colors flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        Add Section
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="h-8 px-3 rounded-md bg-[#4f6ef7] text-white text-[12.5px] font-semibold hover:bg-[#3a56e0] transition-colors flex items-center gap-1.5 shadow-sm shadow-[#4f6ef7]/30"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Task
                    </button>
                </div>
            </div>

            <div className="px-7 pb-10">
                {sections.length === 0 ? (
                    <div className="py-14 text-sm text-gray-400 text-center">No tasks found</div>
                ) : (
                    sections.map((section, index) => {
                        const isCollapsed = !!collapsed[section.key];
                        const sectionRemaining = section.tasks.filter((t) => t.status !== 'done').length;
                        return (
                            <div key={section.key} className="mt-5" style={{ animation: `fadeIn .25s ease ${index * 0.06}s both` }}>
                                <button
                                    onClick={() => setCollapsed((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
                                    className="w-full flex items-center gap-2 py-2 text-left"
                                >
                                    <span className="text-[13.5px] font-bold text-gray-800">{section.label}</span>
                                    <span className="text-xs text-gray-400">{sectionRemaining} remaining</span>
                                    <ChevronDown className={`ml-auto w-3.5 h-3.5 text-gray-300 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                </button>

                                {!isCollapsed && (
                                    <div>
                                        {section.tasks.map((task: any) => (
                                            <div
                                                key={task._id}
                                                onClick={() => handleOpenEdit(task)}
                                                className="group flex items-center gap-2.5 py-2.5 border-t border-gray-100 cursor-pointer hover:bg-gray-50 hover:px-2 hover:mx-[-8px] hover:rounded-md transition-all"
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEdit(task);
                                                    }}
                                                    className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-[#4f6ef7] border-[#4f6ef7]' : 'border-gray-300 hover:border-[#4f6ef7]'}`}
                                                >
                                                    {task.status === 'done' && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                                </button>

                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-[13px] ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{task.title}</p>
                                                </div>

                                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenEdit(task);
                                                        }}
                                                        className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                                        title="View"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenEdit(task);
                                                        }}
                                                        className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    {canDeleteTask && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (window.confirm(`Delete task \"${task.title}\"?`)) deleteMutation.mutate(task._id);
                                                            }}
                                                            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {priorityIcon(task.priority || 'medium')}
                                                    {task.dueDate && <span className="text-xs text-gray-400">{new Date(task.dueDate).toLocaleDateString()}</span>}
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            onClick={handleOpenCreate}
                                            className="w-full flex items-center gap-2 py-2 border-t border-gray-100 text-gray-400 hover:text-[#4f6ef7] transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span className="text-[12.5px]">Add task</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
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
};

export default ProjectTasks;
