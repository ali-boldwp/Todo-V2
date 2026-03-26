import { spawn, ChildProcess } from 'child_process';

const OPENCODE_BASE_PORT = parseInt(process.env.OPENCODE_BASE_PORT || '5010', 10);
const GLOBAL_OPENCODE_URL = process.env.OPENCODE_URL || 'http://localhost:5001';
const OPENCODE_CMD = process.env.OPENCODE_CMD || 'opencode';

interface ServerInstance {
    port: number;
    process: ChildProcess;
    baseUrl: string;
    ready: boolean;
    startedAt: Date;
}

const instances = new Map<string, ServerInstance>();
let nextPort = OPENCODE_BASE_PORT;

/**
 * Get or start a per-project OpenCode server running inside the project's repo directory.
 * Returns the base URL of the server.
 */
export async function getOrStartProjectServer(
    projectId: string,
    repoPath: string
): Promise<string> {
    // Return existing instance if alive
    const existing = instances.get(projectId);
    if (existing && existing.process.exitCode === null) {
        return existing.baseUrl;
    }

    const port = nextPort++;
    const baseUrl = `http://localhost:${port}`;

    const proc = spawn(OPENCODE_CMD, ['serve', '--port', String(port)], {
        cwd: repoPath,
        detached: false,
        stdio: 'ignore',
        env: { ...process.env },
    });

    proc.on('error', (err) => {
        console.error(`[opencode] Project ${projectId} server error:`, err.message);
        instances.delete(projectId);
    });

    proc.on('exit', (code) => {
        console.log(`[opencode] Project ${projectId} server exited (code=${code})`);
        instances.delete(projectId);
    });

    const instance: ServerInstance = {
        port,
        process: proc,
        baseUrl,
        ready: false,
        startedAt: new Date(),
    };
    instances.set(projectId, instance);

    // Wait for the server to be ready (up to 15s)
    await waitForHealth(baseUrl, 15000);
    instance.ready = true;

    return baseUrl;
}

/**
 * Returns the global OpenCode server URL (fallback when no repo is available).
 */
export function getGlobalServerUrl(): string {
    return GLOBAL_OPENCODE_URL;
}

/**
 * Stop a project's OpenCode server and remove it from the registry.
 */
export function stopProjectServer(projectId: string): void {
    const instance = instances.get(projectId);
    if (instance) {
        try { instance.process.kill('SIGTERM'); } catch {}
        instances.delete(projectId);
    }
}

/**
 * List all running server instances (for diagnostics).
 */
export function listRunningServers(): { projectId: string; port: number; startedAt: Date }[] {
    return Array.from(instances.entries()).map(([projectId, inst]) => ({
        projectId,
        port: inst.port,
        startedAt: inst.startedAt,
    }));
}

/**
 * Resolve the best OpenCode server URL for a given project.
 * Uses the per-project repo server if available, otherwise the global server.
 */
export async function resolveServerUrl(
    projectId: string | undefined,
    repoLocalPath: string | undefined
): Promise<string> {
    if (projectId && repoLocalPath) {
        try {
            return await getOrStartProjectServer(projectId, repoLocalPath);
        } catch (err: any) {
            console.warn(`[opencode] Could not start project server for ${projectId}:`, err.message);
        }
    }
    return getGlobalServerUrl();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function waitForHealth(baseUrl: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`${baseUrl}/global/health`);
            if (res.ok) return;
        } catch {}
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(`OpenCode server at ${baseUrl} did not become healthy within ${timeoutMs}ms`);
}
