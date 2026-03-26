import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAIStatus, getAISessions, setupProjectRepo, getProjectAIRepoStatus, getProjects } from '../../services/core';
import { Bot, CheckCircle2, XCircle, RefreshCw, FolderGit2, Loader2, Server, Cpu, ChevronDown, ChevronUp, Terminal, Activity, Circle } from 'lucide-react';
import api from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ connected }: { connected: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${connected ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {connected ? 'Connected' : 'Disconnected'}
        </span>
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

// ─── Live Log Terminal ─────────────────────────────────────────────────────────
function LogTerminal() {
    const [lines, setLines] = React.useState<{ ts: string; text: string; type: string }[]>([]);
    const [streaming, setStreaming] = React.useState(false);
    const [tab, setTab] = React.useState<'live' | 'sessions'>('sessions');
    const logRef = React.useRef<HTMLDivElement>(null);
    const esRef = React.useRef<EventSource | null>(null);

    const { data: sessions, isLoading: loadingSessions, refetch: refetchSessions } = useQuery({
        queryKey: ['ai-sessions'],
        queryFn: getAISessions,
        refetchInterval: tab === 'sessions' ? 10000 : false,
        retry: false,
    });

    // Auto-scroll on new lines
    React.useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [lines]);

    const startStream = () => {
        if (esRef.current) { esRef.current.close(); }
        setLines([]);
        setStreaming(true);

        // Use the API base URL + auth token via a proxied EventSource
        // We pass the token as a query param since EventSource doesn't support headers
        const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
        const base = (api.defaults.baseURL || '').replace(/\/api$/, '');
        const url = `${base}/api/ai/events?token=${encodeURIComponent(token)}`;

        const es = new EventSource(url);
        esRef.current = es;

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                const text = data.type === 'error'
                    ? `ERROR: ${data.message}`
                    : e.data.length > 200 ? e.data.slice(0, 200) + '…' : e.data;
                setLines(prev => [...prev.slice(-199), {
                    ts: new Date().toLocaleTimeString(),
                    text,
                    type: data.type || 'event',
                }]);
            } catch {
                if (e.data.trim()) {
                    setLines(prev => [...prev.slice(-199), {
                        ts: new Date().toLocaleTimeString(),
                        text: e.data,
                        type: 'raw',
                    }]);
                }
            }
        };

        es.onerror = () => {
            setStreaming(false);
            esRef.current = null;
            setLines(prev => [...prev, { ts: new Date().toLocaleTimeString(), text: '— stream closed —', type: 'meta' }]);
        };
    };

    const stopStream = () => {
        esRef.current?.close();
        esRef.current = null;
        setStreaming(false);
        setLines(prev => [...prev, { ts: new Date().toLocaleTimeString(), text: '— stopped —', type: 'meta' }]);
    };

    React.useEffect(() => () => { esRef.current?.close(); }, []);

    return (
        <div className="bg-[#0d0d1a] border border-white/8 rounded-xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-[#111127]">
                <div className="flex gap-1">
                    {(['sessions', 'live'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${tab === t ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {t === 'sessions' ? 'Recent Sessions' : 'Live Stream'}
                        </button>
                    ))}
                </div>

                {tab === 'live' ? (
                    <div className="flex items-center gap-2">
                        {streaming && <span className="text-xs text-emerald-400 flex items-center gap-1"><Circle className="w-2 h-2 fill-emerald-400" /> Live</span>}
                        {streaming ? (
                            <button onClick={stopStream} className="text-xs px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors">Stop</button>
                        ) : (
                            <button onClick={startStream} className="text-xs px-2.5 py-1 rounded bg-violet-600 text-white hover:bg-violet-500 transition-colors flex items-center gap-1">
                                <Activity className="w-3 h-3" /> Start Stream
                            </button>
                        )}
                    </div>
                ) : (
                    <button onClick={() => refetchSessions()} className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                )}
            </div>

            {/* Content */}
            <div ref={logRef} className="h-64 overflow-y-auto font-mono text-xs p-3 space-y-0.5">
                {tab === 'sessions' ? (
                    loadingSessions ? (
                        <div className="text-gray-600 text-center py-8">Loading sessions...</div>
                    ) : !sessions || sessions.length === 0 ? (
                        <div className="text-gray-600 text-center py-8">No sessions yet. Create a task via the AI chatbot to see activity.</div>
                    ) : (
                        sessions.map((s: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 py-1 border-b border-white/5 last:border-0">
                                <span className="text-gray-700 flex-shrink-0 w-16">{s.time?.created ? new Date(s.time.created).toLocaleTimeString() : '—'}</span>
                                <span className="text-violet-400 flex-shrink-0">[session]</span>
                                <span className="text-gray-400 truncate">{s.id || `session-${i}`}</span>
                                <span className="text-gray-700 ml-auto flex-shrink-0">{s.title || ''}</span>
                            </div>
                        ))
                    )
                ) : (
                    lines.length === 0 ? (
                        <div className="text-gray-600 text-center py-8">
                            Click <strong className="text-gray-400">Start Stream</strong> to watch live OpenCode events.
                        </div>
                    ) : (
                        lines.map((l, i) => (
                            <div key={i} className="flex items-start gap-2 py-0.5">
                                <span className="text-gray-700 flex-shrink-0 w-16">{l.ts}</span>
                                <span className={`flex-shrink-0 ${l.type === 'error' ? 'text-red-400' : l.type === 'meta' ? 'text-gray-600' : 'text-emerald-400'}`}>
                                    [{l.type}]
                                </span>
                                <span className="text-gray-400 break-all">{l.text}</span>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
}

// ─── Project Repo Card ────────────────────────────────────────────────────────
function ProjectRepoCard({ project }: { project: any }) {
    const queryClient = useQueryClient();
    const { data: repoStatus, isLoading: loadingStatus } = useQuery({
        queryKey: ['ai-repo-status', project._id],
        queryFn: () => getProjectAIRepoStatus(project._id),
        retry: false,
    });
    const setupMutation = useMutation({
        mutationFn: () => setupProjectRepo(project._id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-repo-status', project._id] }),
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
                        {loadingStatus ? 'Checking...' : !hasRepo ? 'No GitHub repo linked' : cloned ? `${repoStatus.repo} · Cloned` : `${repoStatus.repo} · Not cloned`}
                    </p>
                </div>
            </div>
            <div className="flex-shrink-0">
                {loadingStatus ? <Loader2 className="w-4 h-4 text-gray-500 animate-spin" /> :
                    !hasRepo ? <span className="text-xs text-gray-600">Needs GitHub repo</span> :
                        cloned ? (
                            <button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors disabled:opacity-50">
                                {setupMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Pull Latest
                            </button>
                        ) : (
                            <button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50">
                                {setupMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderGit2 className="w-3 h-3" />}
                                {setupMutation.isPending ? 'Cloning...' : 'Clone Repo'}
                            </button>
                        )}
            </div>
        </div>
    );
}

// ─── Setup Guide ─────────────────────────────────────────────────────────────
function SetupGuide() {
    const [open, setOpen] = React.useState(false);
    return (
        <div className="bg-[#1a1a2e]/60 border border-white/8 rounded-xl overflow-hidden">
            <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <span className="flex items-center gap-2"><Terminal className="w-4 h-4 text-violet-400" /> Linux Server Setup Guide</span>
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {open && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/8 pt-4">
                    {[
                        { n: 1, title: 'In docker-compose.yml set your AI key', code: 'ANTHROPIC_API_KEY=sk-ant-your-key-here' },
                        { n: 2, title: 'Build and start all containers', code: 'docker-compose up -d --build' },
                        { n: 3, title: 'Link a GitHub repo to a project in Project Settings', code: null },
                        { n: 4, title: 'Click "Clone Repo" above — Antigravity gets codebase context', code: null },
                    ].map(s => (
                        <div key={s.n} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-violet-300">{s.n}</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-300 font-medium">{s.title}</p>
                                {s.code && <code className="block bg-black/40 text-emerald-300 text-xs p-2 rounded-lg mt-1 font-mono">{s.code}</code>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
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
                        <p className="text-sm text-gray-500">Repo-aware task planning powered by Antigravity (OpenCode)</p>
                    </div>
                </div>
                <button onClick={() => refetch()} disabled={isFetching}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {/* Status Card */}
            <div className="bg-[#1a1a2e]/60 border border-white/8 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <span className="flex items-center gap-2 text-sm font-semibold text-white"><Server className="w-4 h-4 text-gray-400" /> Server Status</span>
                    {isLoading ? <span className="text-xs text-gray-500">Checking...</span> : <StatusBadge connected={!!status?.connected} />}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <InfoRow icon={<Cpu className="w-3.5 h-3.5" />} label="Server URL" value={status?.serverUrl || '—'} />
                    <InfoRow icon={<Bot className="w-3.5 h-3.5" />} label="Version" value={status?.version || '—'} />
                    <InfoRow icon={status?.connected ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />} label="Global Server" value={status?.connected ? 'Healthy' : 'Unreachable'} />
                    <InfoRow icon={<FolderGit2 className="w-3.5 h-3.5" />} label="Connected Providers" value={status?.connectedProviders?.length ? status.connectedProviders.join(', ') : 'None configured'} />
                </div>
                {!status?.connected && !isLoading && (
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-xs text-amber-300">⚠ Antigravity server unreachable. Make sure <code className="bg-black/30 px-1 rounded">docker-compose up opencode</code> is running and <code className="bg-black/30 px-1 rounded">OPENCODE_URL</code> is set correctly.</p>
                    </div>
                )}
            </div>

            {/* Live Logs */}
            <div>
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-400" /> OpenCode Logs
                </h2>
                <LogTerminal />
            </div>

            {/* Project Repos */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2"><FolderGit2 className="w-4 h-4 text-gray-400" /> Project Repos</h2>
                    <span className="text-xs text-gray-600">Clone repos so AI can reference your real codebase</span>
                </div>
                <div className="space-y-2">
                    {loadingProjects ? <div className="text-sm text-gray-500 text-center py-6">Loading projects...</div> :
                        projects.length === 0 ? <div className="text-sm text-gray-600 text-center py-6">No projects found</div> :
                            projects.map((p: any) => <ProjectRepoCard key={p._id} project={p} />)}
                </div>
            </div>

            {/* Setup Guide */}
            <SetupGuide />
        </div>
    );
}
