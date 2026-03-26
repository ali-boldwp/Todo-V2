import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAIStatus, setupProjectRepo, getProjectAIRepoStatus, getProjects } from '../../services/core';
import { Bot, CheckCircle2, XCircle, RefreshCw, FolderGit2, Loader2, Server, Cpu, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ connected }: { connected: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${connected ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {connected ? 'Connected' : 'Disconnected'}
        </span>
    );
}

// ─── Project Repo Card ───────────────────────────────────────────────────────
function ProjectRepoCard({ project }: { project: any }) {
    const queryClient = useQueryClient();

    const { data: repoStatus, isLoading: loadingStatus } = useQuery({
        queryKey: ['ai-repo-status', project._id],
        queryFn: () => getProjectAIRepoStatus(project._id),
        retry: false,
    });

    const setupMutation = useMutation({
        mutationFn: () => setupProjectRepo(project._id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-repo-status', project._id] });
        },
    });

    const hasRepo = repoStatus?.hasGithubRepo;
    const cloned = repoStatus?.cloned;

    return (
        <div className="bg-[#1a1a2e]/60 border border-white/8 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cloned ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-white/5 border border-white/10'}`}>
                    <FolderGit2 className={`w-4 h-4 ${cloned ? 'text-emerald-400' : 'text-gray-500'}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{project.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                        {loadingStatus ? 'Checking...' :
                            !hasRepo ? 'No GitHub repo linked' :
                            cloned ? `${repoStatus.repo} · Cloned ${repoStatus.repoClonedAt ? new Date(repoStatus.repoClonedAt).toLocaleDateString() : ''}` :
                            `${repoStatus.repo} · Not cloned`}
                    </p>
                </div>
            </div>

            <div className="flex-shrink-0">
                {loadingStatus ? (
                    <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                ) : !hasRepo ? (
                    <span className="text-xs text-gray-600">Needs GitHub repo</span>
                ) : cloned ? (
                    <button
                        onClick={() => setupMutation.mutate()}
                        disabled={setupMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                    >
                        {setupMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Pull Latest
                    </button>
                ) : (
                    <button
                        onClick={() => setupMutation.mutate()}
                        disabled={setupMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
                    >
                        {setupMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderGit2 className="w-3 h-3" />}
                        {setupMutation.isPending ? 'Cloning...' : 'Clone Repo'}
                    </button>
                )}
                {setupMutation.isError && (
                    <p className="text-xs text-red-400 mt-1">{(setupMutation.error as any)?.response?.data?.message || 'Failed'}</p>
                )}
            </div>
        </div>
    );
}

// ─── Setup Guide ──────────────────────────────────────────────────────────────
function SetupGuide() {
    const [open, setOpen] = React.useState(false);
    return (
        <div className="bg-[#1a1a2e]/60 border border-white/8 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
                <span className="flex items-center gap-2"><Terminal className="w-4 h-4 text-violet-400" /> Linux Server Setup Guide</span>
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {open && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/8 pt-4">
                    <Step n={1} title="Install Antigravity on your server">
                        <code className="block bg-black/40 text-emerald-300 text-xs p-3 rounded-lg mt-2 font-mono">npm install -g opencode-ai</code>
                    </Step>
                    <Step n={2} title="Configure your AI provider">
                        <code className="block bg-black/40 text-emerald-300 text-xs p-3 rounded-lg mt-2 font-mono whitespace-pre">{`# In ~/.config/opencode/config.json\n{\n  "providers": {\n    "anthropic": { "api_key": "sk-ant-..." }\n  },\n  "model": "anthropic:claude-sonnet-4-5"\n}`}</code>
                    </Step>
                    <Step n={3} title="Run the setup script">
                        <code className="block bg-black/40 text-emerald-300 text-xs p-3 rounded-lg mt-2 font-mono whitespace-pre">{`export ANTHROPIC_API_KEY=sk-ant-...\nchmod +x scripts/setup-antigravity.sh\nsudo ./scripts/setup-antigravity.sh`}</code>
                    </Step>
                    <Step n={4} title="Add to your API .env">
                        <code className="block bg-black/40 text-emerald-300 text-xs p-3 rounded-lg mt-2 font-mono whitespace-pre">{`OPENCODE_URL=http://localhost:5001\nREPOS_ROOT=/var/devmanager/repos\nOPENCODE_BASE_PORT=5010`}</code>
                    </Step>
                </div>
            )}
        </div>
    );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-violet-300">{n}</span>
            </div>
            <div className="flex-1">
                <p className="text-sm text-gray-300 font-medium">{title}</p>
                {children}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function AntigravityIntegrationPage() {

    const { data: status, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['ai-status'],
        queryFn: getAIStatus,
        refetchInterval: 30000,
        retry: false,
    });

    const { data: projects = [], isLoading: loadingProjects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    return (
        <div className="p-6 max-w-3xl space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Antigravity AI</h1>
                        <p className="text-sm text-gray-500">AI-powered task planning via Antigravity (OpenCode)</p>
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
                    id="refresh-ai-status"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Connection Status Card */}
            <div className="bg-[#1a1a2e]/60 border border-white/8 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-gray-400" />
                        <h2 className="text-sm font-semibold text-white">Server Status</h2>
                    </div>
                    {isLoading ? (
                        <span className="text-xs text-gray-500">Checking...</span>
                    ) : (
                        <StatusBadge connected={!!status?.connected} />
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <InfoRow icon={<Cpu className="w-3.5 h-3.5" />} label="Server URL" value={status?.serverUrl || '—'} />
                    <InfoRow icon={<Bot className="w-3.5 h-3.5" />} label="Version" value={status?.version || '—'} />
                    <InfoRow
                        icon={status?.connected ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        label="Global Server"
                        value={status?.connected ? 'Healthy' : 'Unreachable'}
                    />
                    <InfoRow
                        icon={<FolderGit2 className="w-3.5 h-3.5" />}
                        label="Project Servers"
                        value={`${status?.runningProjectServers?.length ?? 0} running`}
                    />
                </div>

                {!status?.connected && !isLoading && (
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-xs text-amber-300">
                            ⚠ Antigravity server is not reachable. Make sure <code className="bg-black/30 px-1 rounded">opencode serve</code> is running on the server and <code className="bg-black/30 px-1 rounded">OPENCODE_URL</code> is set correctly in your API .env.
                        </p>
                    </div>
                )}
            </div>

            {/* Per-project repos */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <FolderGit2 className="w-4 h-4 text-gray-400" /> Project Repos
                    </h2>
                    <span className="text-xs text-gray-600">Clone repos so Antigravity can reference your codebase</span>
                </div>
                <div className="space-y-2">
                    {loadingProjects ? (
                        <div className="text-sm text-gray-500 text-center py-6">Loading projects...</div>
                    ) : projects.length === 0 ? (
                        <div className="text-sm text-gray-600 text-center py-6">No projects found</div>
                    ) : (
                        projects.map((p: any) => <ProjectRepoCard key={p._id} project={p} />)
                    )}
                </div>
            </div>

            {/* How it works */}
            <div className="bg-[#1a1a2e]/60 border border-white/8 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-violet-400" /> How It Works
                </h2>
                <ol className="space-y-2 text-sm text-gray-400">
                    <li className="flex gap-2"><span className="text-violet-400 font-bold">1.</span> When you create a task via the chatbot, the request is sent to Antigravity</li>
                    <li className="flex gap-2"><span className="text-violet-400 font-bold">2.</span> If a repo is cloned for the project, Antigravity reads the real file tree and tech stack</li>
                    <li className="flex gap-2"><span className="text-violet-400 font-bold">3.</span> An implementation plan is generated with actual file names, functions, and steps</li>
                    <li className="flex gap-2"><span className="text-violet-400 font-bold">4.</span> The plan is saved as the task description — ready to execute immediately</li>
                </ol>
            </div>

            {/* Setup Guide */}
            <SetupGuide />
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2 p-3 bg-white/3 rounded-lg border border-white/5">
            <span className="text-gray-500">{icon}</span>
            <div className="min-w-0">
                <p className="text-xs text-gray-600">{label}</p>
                <p className="text-xs font-medium text-gray-300 truncate">{value}</p>
            </div>
        </div>
    );
}
