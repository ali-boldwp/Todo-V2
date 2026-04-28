"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrStartProjectServer = getOrStartProjectServer;
exports.getGlobalServerUrl = getGlobalServerUrl;
exports.stopProjectServer = stopProjectServer;
exports.listRunningServers = listRunningServers;
exports.resolveServerUrl = resolveServerUrl;
const child_process_1 = require("child_process");
const OPENCODE_BASE_PORT = parseInt(process.env.OPENCODE_BASE_PORT || '5010', 10);
const GLOBAL_OPENCODE_URL = process.env.OPENCODE_URL || 'http://localhost:5001';
const OPENCODE_CMD = process.env.OPENCODE_CMD || 'opencode';
/**
 * Whether we are in "remote sidecar" mode — i.e. the OPENCODE_URL points to
 * a separate container/host (not localhost). In this mode we never try to
 * spawn local opencode processes; all requests go to the global sidecar.
 * opencode is only installed on the sidecar container, not on the API container.
 */
const IS_REMOTE_SIDECAR = (() => {
    try {
        const url = new URL(GLOBAL_OPENCODE_URL);
        // If the hostname is not localhost/127.0.0.1 it's a remote sidecar
        return url.hostname !== 'localhost' && url.hostname !== '127.0.0.1';
    }
    catch {
        return false;
    }
})();
const instances = new Map();
let nextPort = OPENCODE_BASE_PORT;
/**
 * Get or start a per-project OpenCode server running inside the project's repo directory.
 *
 * ⚠️ DOCKER: When IS_REMOTE_SIDECAR is true (OPENCODE_URL points to an external
 * container like http://opencode:5001), this function skips spawning and returns
 * the global sidecar URL. The repo file tree is still injected into the prompt
 * by ai.service.ts for context-aware planning.
 */
async function getOrStartProjectServer(projectId, repoPath) {
    // In Docker / remote sidecar mode: do NOT try to spawn opencode locally.
    // The binary doesn't exist here; all AI goes through the sidecar.
    if (IS_REMOTE_SIDECAR) {
        return GLOBAL_OPENCODE_URL;
    }
    // Return existing instance if alive
    const existing = instances.get(projectId);
    if (existing && existing.process.exitCode === null) {
        return existing.baseUrl;
    }
    const port = nextPort++;
    const baseUrl = `http://localhost:${port}`;
    const proc = (0, child_process_1.spawn)(OPENCODE_CMD, ['serve', '--port', String(port)], {
        cwd: repoPath,
        detached: false,
        stdio: 'ignore',
        shell: process.platform === 'win32',
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
    const instance = {
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
 * Returns the global OpenCode server URL.
 */
function getGlobalServerUrl() {
    return GLOBAL_OPENCODE_URL;
}
/**
 * Stop a project's local OpenCode server.
 * No-op in remote sidecar mode.
 */
function stopProjectServer(projectId) {
    if (IS_REMOTE_SIDECAR)
        return;
    const instance = instances.get(projectId);
    if (instance) {
        try {
            instance.process.kill('SIGTERM');
        }
        catch { }
        instances.delete(projectId);
    }
}
/**
 * List all running local server instances (for diagnostics).
 * Returns empty in remote sidecar mode.
 */
function listRunningServers() {
    return Array.from(instances.entries()).map(([projectId, inst]) => ({
        projectId,
        port: inst.port,
        startedAt: inst.startedAt,
    }));
}
/**
 * Resolve the best OpenCode server URL for a given project.
 *
 * Remote sidecar mode: always returns the global URL.
 *   (The repo file tree is injected as context in the prompt instead.)
 * Local mode: tries to start a per-project server with the repo as cwd.
 */
async function resolveServerUrl(projectId, repoLocalPath) {
    // In Docker/remote mode, per-project spawning is not possible.
    // ai.service.ts still injects the file tree from disk into the prompt.
    if (IS_REMOTE_SIDECAR) {
        return GLOBAL_OPENCODE_URL;
    }
    if (projectId && repoLocalPath) {
        try {
            return await getOrStartProjectServer(projectId, repoLocalPath);
        }
        catch (err) {
            console.warn(`[opencode] Could not start project server for ${projectId}:`, err.message);
        }
    }
    return GLOBAL_OPENCODE_URL;
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
async function waitForHealth(baseUrl, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`${baseUrl}/global/health`);
            if (res.ok)
                return;
        }
        catch { }
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(`OpenCode server at ${baseUrl} did not become healthy within ${timeoutMs}ms`);
}
