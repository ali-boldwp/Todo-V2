import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getIdeUpdateConfig, saveIdeUpdateConfig, uploadIdePluginPackage } from '../services/ide';

const IdeUpdatesIntegration: React.FC = () => {
    const queryClient = useQueryClient();
    const { data: config, isLoading } = useQuery({
        queryKey: ['ide-update-config'],
        queryFn: getIdeUpdateConfig,
    });

    const [latestVersion, setLatestVersion] = React.useState('');
    const [downloadUrl, setDownloadUrl] = React.useState('');
    const [installUrl, setInstallUrl] = React.useState('');
    const [releaseNotesUrl, setReleaseNotesUrl] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [minSupportedVersion, setMinSupportedVersion] = React.useState('');
    const [mandatory, setMandatory] = React.useState(false);
    const [pluginFile, setPluginFile] = React.useState<File | null>(null);
    const [formMessage, setFormMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

    React.useEffect(() => {
        if (!config) return;
        setLatestVersion(config.latestVersion || '');
        setDownloadUrl(config.downloadUrl || '');
        setInstallUrl(config.installUrl || '');
        setReleaseNotesUrl(config.releaseNotesUrl || '');
        setMessage(config.message || '');
        setMinSupportedVersion(config.minSupportedVersion || '');
        setMandatory(Boolean(config.mandatory));
    }, [config]);

    const saveMutation = useMutation({
        mutationFn: saveIdeUpdateConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ide-update-config'] });
            setFormMessage({ type: 'success', text: 'IDE update settings saved.' });
        },
        onError: (err: any) => {
            setFormMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to save IDE update settings' });
        },
    });

    const uploadMutation = useMutation({
        mutationFn: uploadIdePluginPackage,
        onSuccess: (result: any) => {
            if (result?.downloadUrl) {
                setDownloadUrl(result.downloadUrl);
            }
            if (result?.installUrl) {
                setInstallUrl(result.installUrl);
            }
            if (result?.inferredVersion) {
                setLatestVersion(result.inferredVersion);
            }
            setPluginFile(null);
            setFormMessage({
                type: 'success',
                text: result?.inferredVersion
                    ? `Plugin uploaded. URLs filled and version auto-detected: ${result.inferredVersion}`
                    : 'Plugin package uploaded. URLs have been filled.',
            });
        },
        onError: (err: any) => {
            setFormMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to upload plugin package' });
        },
    });

    if (isLoading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">IDE Updates</h1>

            <div className="bg-white p-6 rounded shadow max-w-2xl">
                <h2 className="text-lg font-semibold mb-2">IDE Plugin Update Channel</h2>
                <p className="mb-4 text-sm text-gray-500">
                    Source: <span className="font-semibold capitalize">{config?.source || 'database'}</span>
                </p>

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
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Upload New Plugin ZIP</label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                                type="file"
                                accept=".zip,application/zip"
                                onChange={(e) => setPluginFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm"
                            />
                            <button
                                type="button"
                                disabled={!pluginFile || uploadMutation.isPending}
                                onClick={() => {
                                    setFormMessage(null);
                                    if (!pluginFile) {
                                        setFormMessage({ type: 'error', text: 'Please choose a ZIP file first.' });
                                        return;
                                    }
                                    uploadMutation.mutate(pluginFile);
                                }}
                                className="px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60"
                            >
                                {uploadMutation.isPending ? 'Uploading...' : 'Upload ZIP'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Latest Version</label>
                        <input
                            value={latestVersion}
                            onChange={(e) => setLatestVersion(e.target.value)}
                            placeholder="0.1.2"
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Download URL</label>
                        <input
                            value={downloadUrl}
                            onChange={(e) => setDownloadUrl(e.target.value)}
                            placeholder="https://beta.devregion.com/downloads/devmanager-ide-plugin.zip"
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Install URL (Optional)</label>
                        <input
                            value={installUrl}
                            onChange={(e) => setInstallUrl(e.target.value)}
                            placeholder="https://beta.devregion.com/ide/install/devmanager-ide-plugin.zip"
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Release Notes URL (Optional)</label>
                        <input
                            value={releaseNotesUrl}
                            onChange={(e) => setReleaseNotesUrl(e.target.value)}
                            placeholder="https://beta.devregion.com/releases/ide-plugin"
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Update Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            placeholder="A newer DevManager plugin update is available."
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Min Supported Version (Optional)</label>
                        <input
                            value={minSupportedVersion}
                            onChange={(e) => setMinSupportedVersion(e.target.value)}
                            placeholder="0.1.0"
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={mandatory}
                            onChange={(e) => setMandatory(e.target.checked)}
                        />
                        Mark update as mandatory
                    </label>

                    <button
                        type="button"
                        onClick={() => {
                            setFormMessage(null);
                            if (!latestVersion.trim()) {
                                setFormMessage({ type: 'error', text: 'Latest version is required.' });
                                return;
                            }
                            if (!downloadUrl.trim()) {
                                setFormMessage({ type: 'error', text: 'Download URL is required.' });
                                return;
                            }
                            saveMutation.mutate({
                                latestVersion: latestVersion.trim(),
                                downloadUrl: downloadUrl.trim(),
                                installUrl: installUrl.trim(),
                                releaseNotesUrl: releaseNotesUrl.trim(),
                                message: message.trim(),
                                minSupportedVersion: minSupportedVersion.trim(),
                                mandatory,
                            });
                        }}
                        disabled={saveMutation.isPending}
                        className="w-full bg-slate-900 text-white py-2.5 rounded hover:bg-slate-800 transition-colors"
                    >
                        {saveMutation.isPending ? 'Saving...' : 'Save IDE Update Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IdeUpdatesIntegration;
