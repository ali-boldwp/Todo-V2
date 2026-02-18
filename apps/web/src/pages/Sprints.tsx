import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSprints, createSprint } from '../services/planning';

const Sprints: React.FC = () => {
    const { id: projectId } = useParams<{ id: string }>();
    const { data: sprints, isLoading } = useQuery({
        queryKey: ['sprints', projectId],
        queryFn: () => getSprints(projectId!)
    });
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newSprintName, setNewSprintName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const createMutation = useMutation({
        mutationFn: createSprint,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
            setIsModalOpen(false);
            setNewSprintName('');
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;
        createMutation.mutate({
            projectId,
            name: newSprintName,
            startDate,
            endDate,
            status: 'planned',
        } as any);
    };

    if (isLoading) return <div>Loading sprints...</div>;

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Sprints</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700"
                >
                    Create Sprint
                </button>
            </div>

            <div className="space-y-4">
                {sprints?.map((sprint: any) => (
                    <div key={sprint._id} className="bg-white p-4 rounded shadow border border-gray-100">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold">{sprint.name}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${sprint.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {sprint.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                        </p>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">New Sprint</h3>
                        <form onSubmit={handleCreate}>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={newSprintName}
                                    onChange={(e) => setNewSprintName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full border p-2 rounded"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">End Date</label>
                                <input
                                    type="date"
                                    className="w-full border p-2 rounded"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
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

export default Sprints;
