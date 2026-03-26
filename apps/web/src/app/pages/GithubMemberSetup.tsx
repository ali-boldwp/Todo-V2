import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { getGithubSetupStatus, getGithubSetupUrl } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';

const GithubMemberSetup: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setAuthFromToken } = useAuth();
    const [localError, setLocalError] = useState<string>('');

    const success = searchParams.get('success');
    const callbackToken = searchParams.get('token');
    const callbackUsername = searchParams.get('username');
    const callbackError = searchParams.get('error');

    const readableError = useMemo(() => {
        if (!callbackError) return '';
        return callbackError.replace(/_/g, ' ');
    }, [callbackError]);

    useEffect(() => {
        if (success === '1' && callbackToken) {
            setAuthFromToken(callbackToken);
            navigate('/', { replace: true });
        }
    }, [success, callbackToken, setAuthFromToken, navigate]);

    const { data: status, isLoading } = useQuery({
        queryKey: ['github-setup-status'],
        queryFn: getGithubSetupStatus,
    });

    const connectMutation = useMutation({
        mutationFn: getGithubSetupUrl,
        onSuccess: (data) => {
            window.location.assign(data.url);
        },
        onError: (error: any) => {
            setLocalError(error?.response?.data?.message || 'Failed to start GitHub setup');
        }
    });

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
            <div className="w-full max-w-xl bg-white rounded-xl shadow-md border border-gray-200 p-8">
                <h1 className="text-2xl font-bold text-gray-900">Complete GitHub Setup</h1>
                <p className="text-sm text-gray-600 mt-2">
                    Your account must be connected to GitHub before you can access projects and be assigned as a collaborator.
                </p>

                <div className="mt-6 p-4 rounded-lg border border-gray-200 bg-gray-50">
                    {isLoading ? (
                        <p className="text-sm text-gray-500">Checking setup status...</p>
                    ) : status?.githubSetupCompleted ? (
                        <p className="text-sm text-green-700">
                            Connected as <span className="font-semibold">@{status.githubUsername}</span>. Redirecting...
                        </p>
                    ) : (
                        <p className="text-sm text-amber-700">GitHub is not connected yet.</p>
                    )}
                </div>

                {callbackUsername && (
                    <p className="mt-4 text-sm text-green-700">
                        GitHub connected successfully as <span className="font-semibold">@{callbackUsername}</span>.
                    </p>
                )}

                {readableError && (
                    <p className="mt-4 text-sm text-red-600">Setup error: {readableError}</p>
                )}
                {localError && (
                    <p className="mt-2 text-sm text-red-600">{localError}</p>
                )}

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={() => connectMutation.mutate()}
                        disabled={connectMutation.isPending}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {connectMutation.isPending ? 'Redirecting...' : 'Connect GitHub'}
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
                    >
                        Refresh Status
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GithubMemberSetup;
