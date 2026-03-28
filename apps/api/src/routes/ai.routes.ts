import { Router } from 'express';
import { chatWithAI, TaskDraft, ChatMessage } from '../services/ai.service';
import { authenticate, requireProfileImageSetup, requireGithubSetupForTeamMembers } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import { getGlobalServerUrl, listRunningServers } from '../services/opencode.service';

const router = Router();

/** GET /api/ai/status — health + connected provider info */
router.get('/ai/status', authenticate, async (_req, res) => {
    const serverUrl = getGlobalServerUrl();
    try {
        const [healthRes, providerRes] = await Promise.all([
            fetch(`${serverUrl}/global/health`, { signal: AbortSignal.timeout(5000) }),
            fetch(`${serverUrl}/provider`, { signal: AbortSignal.timeout(5000) }).catch(() => null),
        ]);
        const healthData: any = healthRes.ok ? await healthRes.json() : null;
        const providerData: any = (providerRes && providerRes.ok) ? await providerRes.json() : null;
        res.json({
            connected: healthRes.ok,
            serverUrl,
            version: healthData?.version || null,
            runningProjectServers: listRunningServers(),
            connectedProviders: providerData?.connected || [],
        });
    } catch {
        res.json({
            connected: false,
            serverUrl,
            version: null,
            runningProjectServers: listRunningServers(),
            connectedProviders: [],
        });
    }
});

/**
 * GET /api/ai/events  — SSE proxy to OpenCode's global event stream.
 * Browser connects here and receives live OpenCode events in real time.
 */
router.get('/ai/events', authenticate, async (req: AuthRequest, res) => {
    const serverUrl = getGlobalServerUrl();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const write = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    try {
        const upstream = await fetch(`${serverUrl}/global/event`, {
            signal: AbortSignal.timeout(60000),
        });

        if (!upstream.ok || !upstream.body) {
            write({ type: 'error', message: 'OpenCode event stream unavailable' });
            res.end();
            return;
        }

        reader = upstream.body.getReader();
        const decoder = new TextDecoder();

        req.on('close', () => { reader?.cancel(); });

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
        }
    } catch {
        write({ type: 'error', message: 'Event stream closed' });
    } finally {
        res.end();
    }
});

/**
 * GET /api/ai/sessions — recent OpenCode sessions (newest first, max 20).
 */
router.get('/ai/sessions', authenticate, async (_req, res) => {
    const serverUrl = getGlobalServerUrl();
    try {
        const r = await fetch(`${serverUrl}/session`, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) { res.status(502).json({ error: 'OpenCode unavailable' }); return; }
        const sessions: any[] = await r.json();
        const sorted = [...sessions]
            .sort((a, b) => (b.time?.updated || 0) - (a.time?.updated || 0))
            .slice(0, 20);
        res.json(sorted);
    } catch {
        res.status(502).json({ error: 'OpenCode unavailable' });
    }
});

/** POST /api/ai/chat */
router.post('/ai/chat', authenticate, requireProfileImageSetup, requireGithubSetupForTeamMembers, async (req: AuthRequest, res) => {
    try {
        const { messages, taskDraft, projectId } = req.body as {
            messages: ChatMessage[];
            taskDraft: TaskDraft;
            projectId?: string;
        };

        if (!messages || !Array.isArray(messages)) {
            res.status(400).json({ error: 'Invalid messages array' });
            return;
        }

        const projectQuery: any = {};
        if (req.user!.role !== 'admin') {
            if (req.user!.role === 'client' && req.user!.clientId) {
                projectQuery.clientId = req.user!.clientId;
            } else {
                projectQuery.members = req.user!.userId;
            }
        }

        const Project = (await import('../models/Project')).default;
        const projects = await Project.find(projectQuery).select('_id name repoLocalPath githubRepoOwner githubRepoName');

        const User = (await import('../models/User')).default;
        const teamMembers = await User.find({
            teamId: (req.user as any).teamId,
            isActive: true
        }).select('_id firstName lastName');

        const result = await chatWithAI(
            messages,
            taskDraft || {},
            projectId,
            projects as any,
            teamMembers as any
        );

        res.json(result);
    } catch (error: any) {
        console.error('AI chat route error:', error.message);
        res.status(500).json({ error: 'AI service error', message: error.message });
    }
});

export default router;
