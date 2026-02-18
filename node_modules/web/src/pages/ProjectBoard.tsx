import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, createTask, updateTask } from '../services/task';
// import { Plus } from 'lucide-react';

const COLUMNS = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50' },
    { id: 'review', title: 'Review', color: 'bg-yellow-50' },
    { id: 'done', title: 'Done', color: 'bg-green-50' },
];

const ProjectBoard: React.FC = () => {
    const { id: projectId } = useParams<{ id: string }>();
    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: () => getTasks(projectId!)
    });
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const createMutation = useMutation({
        mutationFn: createTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            setIsModalOpen(false);
            setNewTaskTitle('');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: any }) => updateTask(id, { status }),
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
        } as any); // Type cast due to optional fields
    };

    if (isLoading) return <div>Loading tasks...</div>;

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 px-6 pt-4">
                <h2 className="text-xl font-bold">Board</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700"
                >
                    Add Task
                </button>
            </div>

            <div className="flex-1 overflow-x-auto px-6 pb-6">
                <div className="flex h-full space-x-4 min-w-max">
                    {COLUMNS.map(col => (
                        <div key={col.id} className={`w-80 flex-shrink-0 flex flex-col rounded-lg ${col.color} p-4`}>
                            <h3 className="font-semibold mb-3 text-gray-700 flex justify-between">
                                {col.title}
                                <span className="bg-white px-2 py-0.5 rounded-full text-xs text-gray-500 shadow-sm">
                                    {tasks?.filter((t: any) => t.status === col.id).length || 0}
                                </span>
                            </h3>

                            <div className="flex-1 overflow-y-auto space-y-3">
                                {tasks?.filter((t: any) => t.status === col.id).map((task: any) => (
                                    <div key={task._id} className="bg-white p-3 rounded shadow-sm hover:shadow cursor-pointer border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium text-sm text-gray-900">{task.title}</h4>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {task.priority}
                                            </span>

                                            <div className="flex space-x-1">
                                                {col.id !== 'todo' && (
                                                    <button
                                                        onClick={() => updateMutation.mutate({ id: task._id, status: COLUMNS[COLUMNS.findIndex(c => c.id === col.id) - 1].id })}
                                                        className="text-xs text-gray-400 hover:text-gray-600"
                                                    >
                                                        &lt;
                                                    </button>
                                                )}
                                                {col.id !== 'done' && (
                                                    <button
                                                        onClick={() => updateMutation.mutate({ id: task._id, status: COLUMNS[COLUMNS.findIndex(c => c.id === col.id) + 1].id })}
                                                        className="text-xs text-gray-400 hover:text-gray-600"
                                                    >
                                                        &gt;
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">New Task</h3>
                        <form onSubmit={handleCreate}>
                            <input
                                autoFocus
                                className="w-full border p-2 rounded mb-4"
                                placeholder="Task title..."
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                            />
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-3 py-1.5 border rounded text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectBoard;
