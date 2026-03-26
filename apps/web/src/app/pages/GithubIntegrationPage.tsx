import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGithubConfig, getGithubAuthUrl, handleGithubCallback } from '../../services/github';
import { Github } from 'lucide-react';

export function GithubIntegrationPage() {
    const { data: config, isLoading } = useQuery({ queryKey: ['github-config'], queryFn: getGithubConfig });
    const queryClient = useQueryClient();

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const code = searchParams.get('code');

    const callbackMutation = useMutation({
        mutationFn: handleGithubCallback,
        onSuccess: (data) => {
            console.log('GitHub callback SUCCESS:', data);
            queryClient.invalidateQueries({ queryKey: ['github-config'] });
            navigate('/github', { replace: true });
        },
        onError: (err: any) => {
            console.error('GitHub callback ERROR:', err.response?.data || err.message || err);
            alert('Failed to connect to GitHub: ' + (err.response?.data?.message || err.message || 'Unknown error'));
            navigate('/github', { replace: true });
        }
    });

    const callbackFired = React.useRef(false);

    React.useEffect(() => {
        if (code && !callbackFired.current) {
            callbackFired.current = true;
            callbackMutation.mutate(code);
        }
    }, [code]);

    const handleConnect = async () => {
        try {
            const { url } = await getGithubAuthUrl();
            window.location.href = url;
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to get GitHub Auth URL');
        }
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">GitHub Integration</h1>

            <div className="bg-white p-6 rounded shadow mb-8 max-w-lg">
                <h2 className="text-lg font-semibold mb-4">Configuration</h2>

                {config?.personalAccessToken ? (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                        <div className="flex items-center text-green-700">
                            <Github className="w-5 h-5 mr-2" />
                            <span className="font-semibold text-sm">Connected to GitHub</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleConnect}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                            Reconnect
                        </button>
                    </div>
                ) : (
                    <div className="mb-6">
                        <button
                            type="button"
                            onClick={handleConnect}
                            className="w-full bg-[#24292e] text-white py-2.5 rounded hover:bg-[#1b1f23] flex items-center justify-center space-x-2 transition-colors"
                        >
                            <Github className="w-5 h-5" />
                            <span>Connect via GitHub</span>
                        </button>
                        <p className="text-xs text-gray-400 mt-2 text-center">
                            Automatically generate a token to securely access your repositories.
                        </p>
                    </div>
                )}
            </div>

        </div>
    );
}