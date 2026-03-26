import { useState } from 'react';
import { 
  Github, 
  Unlink, 
  Check, 
  AlertCircle, 
  RefreshCw,
  GitBranch,
  GitCommit,
  Webhook,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  Globe,
  Lock,
  Star,
  GitFork
} from 'lucide-react';

export function GitHubSettingsPage() {
  const [isConnected, setIsConnected] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState('acme-inc/task-manager');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [autoLinkCommits, setAutoLinkCommits] = useState(true);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const webhookSecret = 'whsec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';

  // Mock GitHub account data
  const githubAccount = {
    username: 'john.doe',
    name: 'John Doe',
    email: 'john.doe@acme.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
    connectedAt: '2024-01-15T10:30:00Z',
    repositories: [
      { name: 'acme-inc/task-manager', isPrivate: false, stars: 42, forks: 8 },
      { name: 'acme-inc/frontend-app', isPrivate: true, stars: 15, forks: 3 },
      { name: 'acme-inc/backend-api', isPrivate: true, stars: 28, forks: 5 },
      { name: 'acme-inc/documentation', isPrivate: false, stars: 12, forks: 2 },
    ],
    scopes: ['repo', 'read:user', 'user:email', 'write:repo_hook']
  };

  const handleConnect = () => {
    console.log('🔗 Initiating GitHub OAuth connection...');
    console.log('📡 MESSAGE COMMAND CENTER: GitHub OAuth flow started');
    // In real app, this would redirect to GitHub OAuth
    alert('In a real app, this would redirect to GitHub OAuth authorization page.');
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect GitHub? This will remove all integrations and webhooks.')) {
      setIsConnected(false);
      console.log('🔌 CODEX: GitHub disconnected', {
        username: githubAccount.username,
        timestamp: new Date().toISOString()
      });
      console.log('📡 MESSAGE COMMAND CENTER: GitHub integration removed');
    }
  };


  const handleCopySecret = () => {
    navigator.clipboard.writeText(webhookSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleTestWebhook = () => {
    console.log('🔔 CODEX: Testing webhook', {
      repository: selectedRepo,
      webhookUrl: `${window.location.origin}/api/webhooks/github`,
      timestamp: new Date().toISOString()
    });
    console.log('📡 MESSAGE COMMAND CENTER: Webhook test initiated');
    alert('Webhook test event sent! Check your console for details.');
  };

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
                    <img 
                      src={githubAccount.avatar} 
                      alt={githubAccount.name}
                      className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                    />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        {githubAccount.name} (@{githubAccount.username})
                      </p>
                      <p className="text-xs text-emerald-600">{githubAccount.email}</p>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Connected on {new Date(githubAccount.connectedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
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
                className="px-4 py-2 rounded-lg bg-white border-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 text-sm font-semibold flex items-center gap-2 transition-all"
              >
                <Unlink className="w-4 h-4" />
                Disconnect
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

        {/* Scopes/Permissions */}
        {isConnected && (
          <div className="mt-4 pt-4 border-t-2 border-emerald-200">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
              Granted Permissions
            </p>
            <div className="flex flex-wrap gap-2">
              {githubAccount.scopes.map((scope) => (
                <span
                  key={scope}
                  className="px-2 py-1 rounded-md bg-white border border-emerald-200 text-xs font-mono text-emerald-700"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings sections - only show when connected */}
      {isConnected && (
        <div className="space-y-6">
          {/* Repository Settings */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Repository Configuration</h3>
                <p className="text-xs text-slate-500">Select the repository to integrate with your workspace</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Repository Selection */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Connected Repository
                </label>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-medium"
                >
                  {githubAccount.repositories.map((repo) => (
                    <option key={repo.name} value={repo.name}>
                      {repo.name} {repo.isPrivate ? '(Private)' : '(Public)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Repo Details */}
              {selectedRepo && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-slate-600" />
                      <span className="font-semibold text-sm text-slate-900">{selectedRepo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {githubAccount.repositories.find(r => r.name === selectedRepo)?.isPrivate ? (
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
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {githubAccount.repositories.find(r => r.name === selectedRepo)?.stars} stars
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3 h-3" />
                      {githubAccount.repositories.find(r => r.name === selectedRepo)?.forks} forks
                    </span>
                  </div>
                </div>
              )}

              {/* Default Branch */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Default Branch
                </label>
                <input
                  type="text"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm"
                  placeholder="main"
                />
              </div>
            </div>
          </div>

          {/* Commit Linking */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
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
                  onChange={(e) => setAutoLinkCommits(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    Enable automatic commit linking
                  </p>
                  <p className="text-xs text-slate-500">
                    When enabled, commits with task IDs in the message (e.g., "feat: add login #TASK-123") will be automatically linked to the corresponding task.
                  </p>
                </div>
              </label>

              {autoLinkCommits && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-900 mb-2">HOW TO USE</p>
                  <div className="space-y-1 text-xs text-blue-700">
                    <p>• Include task ID in commit message: <code className="px-1 py-0.5 bg-blue-100 rounded font-mono">#TASK-123</code></p>
                    <p>• Example: <code className="px-1 py-0.5 bg-blue-100 rounded font-mono">git commit -m "fix: resolve login issue #TASK-123"</code></p>
                    <p>• Commits will appear in the task's activity timeline</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Webhook className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Webhook Settings</h3>
                <p className="text-xs text-slate-500">Configure GitHub webhooks for real-time updates</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-300 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={webhookEnabled}
                  onChange={(e) => setWebhookEnabled(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    Enable webhooks
                  </p>
                  <p className="text-xs text-slate-500">
                    Receive real-time notifications for push events, pull requests, and issue updates.
                  </p>
                </div>
              </label>

              {webhookEnabled && (
                <div className="space-y-4">
                  {/* Webhook URL */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                      Webhook URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/api/webhooks/github`}
                        readOnly
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-mono text-slate-600"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/github`);
                        }}
                        className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-slate-700 font-semibold transition-all"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Webhook Secret */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                      Webhook Secret
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showWebhookSecret ? 'text' : 'password'}
                          value={webhookSecret}
                          readOnly
                          className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-mono text-slate-600"
                        />
                        <button
                          onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        onClick={handleCopySecret}
                        className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-slate-700 font-semibold transition-all"
                      >
                        {copiedSecret ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Use this secret to verify webhook payloads in your GitHub repository settings
                    </p>
                  </div>

                  {/* Events */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                      Subscribed Events
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Push', 'Pull Request', 'Issues', 'Commits', 'Branches', 'Releases'].map((event) => (
                        <div key={event} className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-900">{event}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Test Webhook */}
                  <button
                    onClick={handleTestWebhook}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Test Webhook
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Status & Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Integration Status
                </p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Your GitHub integration is active and healthy. All webhooks are configured correctly and receiving events. 
                  Last sync: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
