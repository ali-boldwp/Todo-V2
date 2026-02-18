import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTimeEntries, startTimer, stopTimer } from '../services/time';

const Time: React.FC = () => {
    const { data: entries, isLoading } = useQuery({ queryKey: ['time-entries'], queryFn: getTimeEntries });
    const queryClient = useQueryClient();
    const [description, setDescription] = useState('');

    const startMutation = useMutation({
        mutationFn: startTimer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['time-entries'] });
            setDescription('');
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Failed to start timer');
        }
    });

    const stopMutation = useMutation({
        mutationFn: stopTimer,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-entries'] }),
    });

    const runningEntry = entries?.find((e: any) => !e.endTime);

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Time Tracking</h1>

            <div className="bg-white p-6 rounded shadow mb-8">
                <h2 className="text-lg font-semibold mb-4">Timer</h2>
                {runningEntry ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-600 font-bold">Running...</p>
                            <p className="text-gray-600">{runningEntry.description || 'No description'}</p>
                            <p className="text-xs text-gray-400">Started at: {new Date(runningEntry.startTime).toLocaleTimeString()}</p>
                        </div>
                        <button
                            onClick={() => stopMutation.mutate()}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                        >
                            Stop Timer
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center space-x-4">
                        <input
                            className="flex-1 border p-2 rounded"
                            placeholder="What are you working on?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                        <button
                            onClick={() => startMutation.mutate({ description })}
                            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                        >
                            Start Timer
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (min)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {entries?.filter((e: any) => e.endTime).map((entry: any) => (
                            <tr key={entry._id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(entry.startTime).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {entry.description || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(entry.startTime).toLocaleTimeString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(entry.endTime).toLocaleTimeString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {entry.duration}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Time;
