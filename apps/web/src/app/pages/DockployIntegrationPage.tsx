import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDockployConfig, saveDockployConfig, getDockployConnectionStatus } from '../../services/dockploy';

export function DockployIntegrationPage() {
    const queryClient = useQueryClient();
    const { data: dockployConfig, isLoading } = useQuery({
        queryKey: ['dockploy-config'],
        queryFn: getDockployConfig,
    });
    const { data: connectionStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
        queryKey: ['dockploy-connection-status'],
        queryFn: getDockployConnectionStatus,
    });

    const [baseUrl, setBaseUrl] = React.useState('');
    const [apiToken, setApiToken] = React.useState('');
    const [deployPathTemplate, setDeployPathTemplate] = React.useState('/api/application/{appId}/deploy');
    const [appStatusPathTemplate, setAppStatusPathTemplate] = React.useState('/api/application/{appId}');
    const [formMessage, setFormMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

    React.useEffect(() => {
        if (!dockployConfig) return;
        setBaseUrl(dockployConfig.baseUrl || '');
        setDeployPathTemplate(dockployConfig.deployPathTemplate || '/api/application/{appId}/deploy');
        setAppStatusPathTemplate(dockployConfig.appStatusPathTemplate || '/api/application/{appId}');
    }, [dockployConfig]);

    const saveMutation = useMutation({
        mutationFn: saveDockployConfig,
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ['dockploy-config'] });
            queryClient.invalidateQueries({ queryKey: ['dockploy-connection-status'] });
            setApiToken('');
            if (result?.connectionVerified) {
                setFormMessage({ type: 'success', text: 'Dockploy settings saved and connection verified.' });
                return;
            }
            if (result?.endpointDiscoveryFailed) {
                setFormMessage({
                    type: 'error',
                    text: `Settings saved, but endpoint auto-detection failed. ${result?.connectionMessage || ''} Configure path templates manually for your Dockploy version.`,
                });
                return;
            }
            setFormMessage({ type: 'success', text: 'Dockploy settings saved.' });
        },
        onError: (err: any) => {
            setFormMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to save Dockploy settings' });
        }
    });

    if (isLoading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Dockploy Integration</h1>

            <div className="bg-white p-6 rounded shadow max-w-2xl">
                <h2 className="text-lg font-semibold mb-4">Global Configuration</h2>
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 flex items-center justify-between">
                    <div className="text-sm">
                        <span className="text-gray-600 mr-2">Connection Status:</span>
                        {statusLoading ? (
                            <span className="font-semibold text-gray-700">Checking...</span>
                        ) : connectionStatus?.connected ? (
                            <span className="font-semibold text-emerald-700">Connected</span>
                        ) : (
                            <span className="font-semibold text-red-700">Disconnected</span>
                        )}
                        {connectionStatus?.endpoint && (
                            <span className="ml-2 text-xs text-gray-500">({connectionStatus.endpoint})</span>
                        )}
                    </div>
                    <button
                        onClick={() => refetchStatus()}
                        className="px-2.5 py-1 text-xs font-semibold rounded border border-gray-200 bg-white hover:bg-gray-100"
                    >
                        Refresh
                    </button>
                </div>
                {!statusLoading && connectionStatus?.message && (
                    <p className="mb-3 text-xs text-gray-500">{connectionStatus.message}</p>
                )}
                {formMessage && (
                    <div
                        className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                            formMessage.type === 'success'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-red-200 bg-red-50 text-red-700'
                        }`}
                    >
                        {formMessage.text}
                    </div>
                )}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Base URL</label>
                        <input
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://dockploy.example.com"
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">API Token</label>
                        <input
                            value={apiToken}
                            onChange={(e) => setApiToken(e.target.value)}
                            type="password"
                            placeholder={dockployConfig?.hasApiToken ? 'Token saved (enter to replace)' : 'Paste Dockploy API token'}
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Deploy Path Template</label>
                        <input
                            value={deployPathTemplate}
                            onChange={(e) => setDeployPathTemplate(e.target.value)}
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Status Path Template</label>
                        <input
                            value={appStatusPathTemplate}
                            onChange={(e) => setAppStatusPathTemplate(e.target.value)}
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setFormMessage(null);
                            if (!baseUrl.trim()) {
                                setFormMessage({ type: 'error', text: 'Base URL is required.' });
                                return;
                            }
                            if (!apiToken.trim() && !dockployConfig?.hasApiToken) {
                                setFormMessage({ type: 'error', text: 'API token is required.' });
                                return;
                            }
                            saveMutation.mutate({
                                baseUrl: baseUrl.trim(),
                                apiToken: apiToken.trim(),
                                deployPathTemplate: deployPathTemplate.trim(),
                                appStatusPathTemplate: appStatusPathTemplate.trim(),
                            });
                        }}
                        disabled={saveMutation.isPending}
                        className="w-full bg-slate-900 text-white py-2.5 rounded hover:bg-slate-800 transition-colors"
                    >
                        {saveMutation.isPending ? 'Saving...' : 'Save Dockploy Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}