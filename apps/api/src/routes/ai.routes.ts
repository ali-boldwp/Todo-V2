import { Router } from 'express';
import { chatWithAI, TaskDraft, ChatMessage } from '../services/ai.service';
import { authenticate, requireProfileImageSetup, requireGithubSetupForTeamMembers } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import { getGlobalServerUrl, listRunningServers } from '../services/opencode.service';

const router = Router();

/** GET /api/ai/status — health check for the Antigravity server */
router.get('/ai/status', authenticate, async (_req, res) => {
    const serverUrl = getGlobalServerUrl();
    try {
        const healthRes = await fetch(`${serverUrl}/global/health`, { signal: AbortSignal.timeout(5000) });
        const data: any = healthRes.ok ? await healthRes.json() : null;
        res.json({
            connected: healthRes.ok,
            serverUrl,
            version: data?.version || null,
            runningProjectServers: listRunningServers(),
        });
    } catch {
        res.json({
            connected: false,
            serverUrl,
            version: null,
            runningProjectServers: listRunningServers(),
        });
    }
});

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
        const projects = await Project.find(projectQuery).select('_id name repoLocalPath');

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