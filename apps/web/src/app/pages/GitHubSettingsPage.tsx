import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Github, 
  Unlink, 
  Check, 
  GitBranch,
  GitCommit,
  Globe,
  Lock,
  Loader2
} from 'lucide-react';
import { getGithubConfig, saveGithubConfig, disconnectGithub, getGithubAuthUrl, handleGithubCallback, getGithubRepos } from '../../services/github';

export function GitHubSettingsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  const { data: config, isLoading: isConfigLoading } = useQuery({ 
    queryKey: ['github-config'], 
    queryFn: getGithubConfig 
  });
  
  const isConnected = !!config?.personalAccessToken;

  const { data: repositories = [], isLoading: isReposLoading } = useQuery({
    queryKey: ['github-repos'],
    queryFn: getGithubRepos,
    enabled: isConnected
  });

  const [selectedRepo, setSelectedRepo] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('dev');
  const [autoLinkCommits] = useState(true);

  const callbackMutation = useMutation({
    mutationFn: handleGithubCallback,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['github-config'] });
        navigate('/github-settings', { replace: true });
    },
    onError: (err: any) => {
        alert('Failed to connect to GitHub: ' + (err.response?.data?.message || err.message || 'Unknown error'));
        navigate('/github-settings', { replace: true });
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: saveGithubConfig,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['github-config'] });
        alert('Settings saved successfully!');
    },
    onError: (err: any) => {
        alert('Failed to save settings: ' + (err.response?.data?.message || err.message));
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGithub,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['github-config'] });
        queryClient.invalidateQueries({ queryKey: ['github-repos'] });
    },
    onError: (err: any) => {
        alert('Failed to disconnect GitHub: ' + (err.response?.data?.message || err.message));
    }
  });

  const callbackFired = useRef(false);

  useEffect(() => {
    if (code && !callbackFired.current) {
        callbackFired.current = true;
        callbackMutation.mutate(code);
    }
  }, [code, callbackMutation]);

  useEffect(() => {
    if (config?.repoName && !selectedRepo) {
      setSelectedRepo(config.repoName);
    }
  }, [config, selectedRepo]);

  const handleConnect = async () => {
    try {
        const { url } = await getGithubAuthUrl();
        window.location.href = url;
    } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to get GitHub Auth URL');
    }
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect GitHub? This will remove all integrations.')) {
      disconnectMutation.mutate();
    }
  };

  const handleSaveRepo = () => {
    if (!selectedRepo) return;
    const repo = repositories.find((r: any) => r.name === selectedRepo || r.fullName === selectedRepo);
    if (repo && config?.personalAccessToken) {
      updateConfigMutation.mutate({ 
        personalAccessToken: config.personalAccessToken, 
        repoOwner: repo.owner, 
        repoName: repo.name 
      });
    }
  };

  if (isConfigLoading || callbackMutation.isPending) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Loading GitHub Settings...</p>
        </div>
      </div>
    );
  }

  const selectedRepoData = repositories.find((r: any) => r.name === selectedRepo || r.fullName === selectedRepo);

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <Github className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">GitHub Integration</h1>
            <p className="text-sm text-slate-500">Connect your GitHub account and configure repository settings</p>
          </div>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className={`mb-6 p-6 rounded-2xl border-2 ${
        isConnected 
          ? 'bg-emerald-50 border-emerald-200' 
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {isConnected ? (
              <div className="w-14 h-14 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-7 h-7 text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-300 flex items-center justify-center shrink-0">
                <Unlink className="w-7 h-7 text-slate-600" />
              </div>
            )}
            
            <div className="flex-1">
              <h2 className={`text-lg font-bold mb-1 ${
                isConnected ? 'text-emerald-900' : 'text-slate-700'
              }`}>
                {isConnected ? 'GitHub Connected' : 'GitHub Disconnected'}
              </h2>
              
              {isConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-emerald-100 flex items-center justify-center">
                      <Github className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                         Integration Active
                      </p>
                      <p className="text-xs text-emerald-600">Secure Personal Access Token Present</p>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Your global workspace GitHub configurations are active and authenticated.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Connect your GitHub account to enable repository integration, commit tracking, and automated workflows.
                </p>
              )}
            </div>
          </div>

          <div>
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
                className="px-4 py-2 rounded-lg bg-white border-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Unlink className="w-4 h-4" />
                {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Github className="w-4 h-4" />
                Connect GitHub
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Settings sections - only show when connected */}
      {isConnected && (
        <div className="space-y-6">
          {/* Repository Settings */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Repository Configuration</h3>
                  <p className="text-xs text-slate-500">Select the global repository to integrate with your workspace</p>
                </div>
              </div>
              <button 
                onClick={handleSaveRepo}
                disabled={!selectedRepo || updateConfigMutation.isPending || (config?.repoName === selectedRepo)}
                className="px-4 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>

            <div className="space-y-4">
              {/* Repository Selection */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Connected Repository
                </label>
                {isReposLoading ? (
                  <div className="p-3 text-sm text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading repositories...
                  </div>
                ) : (
                  <select
                    value={selectedRepo || ''}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-medium"
                  >
                    <option value="" disabled>Select a repository...</option>
                    {repositories.map((repo: any) => (
                      <option key={repo.id} value={repo.name}>
                        {repo.fullName} {repo.private ? '(Private)' : '(Public)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selected Repo Details */}
              {selectedRepoData && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-slate-600" />
                      <a href={selectedRepoData.url} target="_blank" rel="noreferrer" className="font-semibold text-sm text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1">
                        {selectedRepoData.fullName}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedRepoData.private ? (
                        <span className="px-2 py-1 rounded-md bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-700 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Private
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-md bg-blue-100 border border-blue-200 text-xs font-semibold text-blue-700 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Public
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Default Branch */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Default Base Branch
                </label>
                <input
                  type="text"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm"
                  placeholder="dev"
                />
              </div>
            </div>
          </div>

          {/* Commit Linking Placeholder */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 opacity-60 pointer-events-none relative">
             <div className="absolute inset-0 bg-white/20 z-10 flex items-center justify-center backdrop-blur-[1px]">
                 <span className="bg-slate-800 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-full">Coming Soon</span>
             </div>
             <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                    <GitCommit className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Commit Tracking</h3>
                    <p className="text-xs text-slate-500">Automatically link commits to tasks using task IDs</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-300 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={autoLinkCommits}
                      readOnly
                      className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 mb-1">
                        Enable automatic commit linking
                      </p>
                      <p className="text-xs text-slate-500">
                        When enabled, commits with task IDs in the message will be linked automatically.
                      </p>
                    </div>
                  </label>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
