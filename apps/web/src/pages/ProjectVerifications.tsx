import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTasks } from '../services/task';
import { useAuth } from '../context/AuthContext';
import CreateTaskDrawer from '../components/CreateTaskDrawer';

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const ProjectVerifications: React.FC = () => {
    const { id: projectId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const [selectedTask, setSelectedTask] = React.useState<any>(null);

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: () => getTasks(projectId!),
        enabled: !!projectId,
    });

    if (isLoading) return <div className="p-6 text-sm text-gray-500">Loading verifications...</div>;
    if (!['admin', 'manager', 'member'].includes(user?.role || '')) {
        return <div className="p-6 text-sm text-gray-500">Only team members can access verifications.</div>;
    }

    const pending = tasks.filter((t: any) => {
        const verifierId = t.verifierId?._id || t.verifierId;
        return t.verificationStatus === 'pending' && verifierId === user?.id;
    });

    return (
        <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Verifications</h2>
            {pending.length === 0 ? (
                <div className="text-sm text-gray-500">No tasks pending your verification.</div>
            ) : (
                <div className="space-y-3">
                    {pending.map((task: any) => (
                        <div key={task._id} className="border border-gray-200 rounded-lg p-4 bg-white">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">{task.title}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Total worked: {formatDuration(Number(task.totalWorkedSecondsComputed || task.totalWorkedSeconds || 0))}
                                    </p>
                                    {Array.isArray(task.workLogs) && task.workLogs.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {task.workLogs.map((log: any, idx: number) => {
                                                const name = log.userId
                                                    ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim() || log.userId.email
                                                    : 'Unknown user';
                                                return (
                                                    <div key={idx} className="text-xs text-gray-600">
                                                        {name}: <span className="font-medium">{formatDuration(Number(log.seconds || 0))}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedTask(task);
                                            setIsDrawerOpen(true);
                                        }}
                                        className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded hover:bg-indigo-100"
                                    >
                                        Preview
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CreateTaskDrawer
                isOpen={isDrawerOpen}
                onClose={() => { setIsDrawerOpen(false); setSelectedTask(null); }}
                task={selectedTask}
                initialProjectId={projectId}
            />
        </div>
    );
};

export default ProjectVerifications;
