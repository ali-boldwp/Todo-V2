import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGithubConfig, saveGithubConfig, syncIssues } from '../services/github';
import { GithubConfigInput } from '@devmanager/shared/dist/index';

const GithubIntegration: React.FC = () => {
    const { data: config, isLoading } = useQuery({ queryKey: ['github-config'], queryFn: getGithubConfig });
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<GithubConfigInput>({
        personalAccessToken: '',
        repoOwner: '',
        repoName: '',
    });

    // Load initial data
    React.useEffect(() => {
        if (config) {
            setFormData({
                personalAccessToken: config.personalAccessToken || '',
                repoOwner: config.repoOwner || '',
                repoName: config.repoName || '',
            });
        }
    }, [config]);

    const saveMutation = useMutation({
        mutationFn: saveGithubConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['github-config'] });
            alert('Configuration saved!');
        },
        onError: (err: any) => alert(err.response?.data?.message || 'Failed to save configuration'),
    });

    const syncMutation = useMutation({
        mutationFn: syncIssues,
        onSuccess: () => alert('Sync started successfully!'),
        onError: (err: any) => alert(err.response?.data?.message || 'Failed to start sync'),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">GitHub Integration</h1>

            <div className="bg-white p-6 rounded shadow mb-8 max-w-lg">
                <h2 className="text-lg font-semibold mb-4">Configuration</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Personal Access Token</label>
                        <input
                            type="password"
                            className="w-full border p-2 rounded"
                            value={formData.personalAccessToken}
                            onChange={(e) => setFormData({ ...formData, personalAccessToken: e.target.value })}
                            required
                        />
                        <p className="text-xs text-gray-400 mt-1">Token requires 'repo' scope.</p>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Repository Owner</label>
                        <input
                            className="w-full border p-2 rounded"
                            value={formData.repoOwner}
                            onChange={(e) => setFormData({ ...formData, repoOwner: e.target.value })}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-1">Repository Name</label>
                        <input
                            className="w-full border p-2 rounded"
                            value={formData.repoName}
                            onChange={(e) => setFormData({ ...formData, repoName: e.target.value })}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
                    >
                        Save Configuration
                    </button>
                </form>
            </div>

            <div className="bg-white p-6 rounded shadow max-w-lg">
                <h2 className="text-lg font-semibold mb-4">Actions</h2>
                <button
                    onClick={() => syncMutation.mutate()}
                    className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 flex items-center space-x-2"
                >
                    <span>Sync Issues to Tasks</span>
                </button>
            </div>
        </div>
    );
};

export default GithubIntegration;
