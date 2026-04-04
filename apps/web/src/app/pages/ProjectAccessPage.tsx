import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProject, updateProject } from '../../services/core';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Save, ExternalLink } from 'lucide-react';

type AccessAccount = {
    label: string;
    username: string;
    password: string;
    notes?: string;
};

const emptyAccount = (): AccessAccount => ({
    label: '',
    username: '',
    password: '',
    notes: '',
});

export function ProjectAccessPage() {
    const { id: projectId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isAdmin = user?.role === 'admin';

    const { data: project, isLoading } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => getProject(projectId!),
        enabled: !!projectId,
    });

    const [devWebsiteUrl, setDevWebsiteUrl] = useState('');
    const [projectUrl, setProjectUrl] = useState('');
    const [accounts, setAccounts] = useState<AccessAccount[]>([]);

    useEffect(() => {
        if (!project) return;
        setProjectUrl(project.projectUrl || '');
        setDevWebsiteUrl(project.devWebsiteUrl || '');
        setAccounts(Array.isArray(project.accessAccounts) ? project.accessAccounts : []);
    }, [project]);

    const saveMutation = useMutation({
        mutationFn: () => updateProject(projectId!, { projectUrl, devWebsiteUrl, accessAccounts: accounts } as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    const updateAccount = (index: number, patch: Partial<AccessAccount>) => {
        setAccounts((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    };

    if (isLoading) return <div className="p-6 text-sm text-gray-500">Loading access settings...</div>;
    if (!project) return <div className="p-6 text-sm text-gray-500">Project not found</div>;
    if (!isAdmin) return <div className="p-6 text-sm text-red-500">Only admin can manage project access.</div>;

    return (
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h1 className="text-xl font-bold text-gray-900">Project Access</h1>
                <p className="text-sm text-gray-500 mt-1">Save dev URL and multiple account credentials for this project.</p>

                <div className="mt-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Project URL (Live)</label>
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="url"
                            value={projectUrl}
                            onChange={(e) => setProjectUrl(e.target.value)}
                            placeholder="https://www.example.com"
                            className="flex-1 h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm"
                        />
                        {projectUrl && (
                            <a
                                href={projectUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-10 px-3 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm inline-flex items-center gap-1.5"
                            >
                                <ExternalLink size={14} />
                                Open
                            </a>
                        )}
                    </div>

                    <label className="block text-sm font-semibold text-gray-700 mb-2">Dev Website URL</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="url"
                            value={devWebsiteUrl}
                            onChange={(e) => setDevWebsiteUrl(e.target.value)}
                            placeholder="https://dev.example.com"
                            className="flex-1 h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm"
                        />
                        {devWebsiteUrl && (
                            <a
                                href={devWebsiteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-10 px-3 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm inline-flex items-center gap-1.5"
                            >
                                <ExternalLink size={14} />
                                Open
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Account Access</h2>
                    <button
                        onClick={() => setAccounts((prev) => [...prev, emptyAccount()])}
                        className="h-9 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium inline-flex items-center gap-1.5"
                    >
                        <Plus size={14} />
                        Add Account
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    {accounts.length === 0 && (
                        <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-md p-4">
                            No accounts added yet.
                        </div>
                    )}
                    {accounts.map((account, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    value={account.label}
                                    onChange={(e) => updateAccount(index, { label: e.target.value })}
                                    placeholder="Label (e.g. Admin Panel)"
                                    className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
                                />
                                <input
                                    value={account.username}
                                    onChange={(e) => updateAccount(index, { username: e.target.value })}
                                    placeholder="Username / Email"
                                    className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
                                />
                                <input
                                    value={account.password}
                                    onChange={(e) => updateAccount(index, { password: e.target.value })}
                                    placeholder="Password"
                                    className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
                                />
                                <input
                                    value={account.notes || ''}
                                    onChange={(e) => updateAccount(index, { notes: e.target.value })}
                                    placeholder="Notes (optional)"
                                    className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
                                />
                            </div>
                            <div className="mt-3">
                                <button
                                    onClick={() => setAccounts((prev) => prev.filter((_, i) => i !== index))}
                                    className="h-8 px-2.5 rounded-md text-red-600 hover:bg-red-50 text-sm inline-flex items-center gap-1"
                                >
                                    <Trash2 size={14} />
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="h-10 px-4 rounded-md bg-gray-900 hover:bg-black text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                >
                    <Save size={14} />
                    {saveMutation.isPending ? 'Saving...' : 'Save Access Settings'}
                </button>
            </div>
        </div>
    );
}