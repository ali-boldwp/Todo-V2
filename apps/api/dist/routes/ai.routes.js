"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const opencode_service_1 = require("../services/opencode.service");
const router = (0, express_1.Router)();
/** GET /api/ai/status — health + connected provider info */
router.get('/ai/status', auth_1.authenticate, async (_req, res) => {
    const serverUrl = (0, opencode_service_1.getGlobalServerUrl)();
    try {
        const [healthRes, providerRes] = await Promise.all([
            fetch(`${serverUrl}/global/health`, { signal: AbortSignal.timeout(5000) }),
            fetch(`${serverUrl}/provider`, { signal: AbortSignal.timeout(5000) }).catch(() => null),
        ]);
        const healthData = healthRes.ok ? await healthRes.json() : null;
        const providerData = (providerRes && providerRes.ok) ? await providerRes.json() : null;
        res.json({
            connected: healthRes.ok,
            serverUrl,
            version: healthData?.version || null,
            runningProjectServers: (0, opencode_service_1.listRunningServers)(),
            connectedProviders: providerData?.connected || [],
        });
    }
    catch {
        res.json({
            connected: false,
            serverUrl,
            version: null,
            runningProjectServers: (0, opencode_service_1.listRunningServers)(),
            connectedProviders: [],
        });
    }
});
/**
 * GET /api/ai/events  — SSE proxy to OpenCode's global event stream.
 * Browser connects here and receives live OpenCode events in real time.
 */
router.get('/ai/events', auth_1.authenticate, async (req, res) => {
    const serverUrl = (0, opencode_service_1.getGlobalServerUrl)();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const write = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    let reader;
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
            if (done)
                break;
            res.write(decoder.decode(value, { stream: true }));
        }
    }
    catch {
        write({ type: 'error', message: 'Event stream closed' });
    }
    finally {
        res.end();
    }
});
/**
 * GET /api/ai/sessions — recent OpenCode sessions (newest first, max 20).
 */
router.get('/ai/sessions', auth_1.authenticate, async (_req, res) => {
    const serverUrl = (0, opencode_service_1.getGlobalServerUrl)();
    try {
        const r = await fetch(`${serverUrl}/session`, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) {
            res.status(502).json({ error: 'OpenCode unavailable' });
            return;
        }
        const sessions = await r.json();
        const sorted = [...sessions]
            .sort((a, b) => (b.time?.updated || 0) - (a.time?.updated || 0))
            .slice(0, 20);
        res.json(sorted);
    }
    catch {
        res.status(502).json({ error: 'OpenCode unavailable' });
    }
});
/** POST /api/ai/chat/stream */
router.post('/ai/chat/stream', auth_1.authenticate, auth_1.requireProfileImageSetup, auth_1.requireGithubSetupForTeamMembers, async (req, res) => {
    try {
        const { messages, taskDraft, projectId } = req.body;
        if (!messages || !Array.isArray(messages)) {
            res.status(400).json({ error: 'Invalid messages array' });
            return;
        }
        const projectQuery = {};
        if (req.user.role !== 'admin') {
            if (req.user.role === 'client' && req.user.clientId) {
                projectQuery.clientId = req.user.clientId;
            }
            else {
                projectQuery.members = req.user.userId;
            }
        }
        const Project = (await Promise.resolve().then(() => __importStar(require('../models/Project')))).default;
        const projects = await Project.find(projectQuery).select('_id name repoLocalPath githubRepoOwner githubRepoName');
        const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
        const teamMembers = await User.find({
            teamId: req.user.teamId,
            isActive: true
        }).select('_id firstName lastName');
        // Setup SSE Headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // Disable buffering for real-time streaming
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        const { streamChatWithAI } = await Promise.resolve().then(() => __importStar(require('../services/ai.service')));
        try {
            for await (const chunk of streamChatWithAI(messages, taskDraft || {}, projectId, projects, teamMembers)) {
                // write to stream
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
        }
        catch (streamError) {
            console.error('AI chat stream error:', streamError.message);
            res.write(`data: ${JSON.stringify({ type: 'error', error: streamError.message })}\n\n`);
        }
        finally {
            res.end();
        }
    }
    catch (error) {
        console.error('AI chat route error:', error.message);
        res.status(500).json({ error: 'AI service error', message: error.message });
    }
});
/** POST /api/ai/chat */
router.post('/ai/chat', auth_1.authenticate, auth_1.requireProfileImageSetup, auth_1.requireGithubSetupForTeamMembers, async (req, res) => {
    try {
        const { messages, taskDraft, projectId } = req.body;
        if (!messages || !Array.isArray(messages)) {
            res.status(400).json({ error: 'Invalid messages array' });
            return;
        }
        const projectQuery = {};
        if (req.user.role !== 'admin') {
            if (req.user.role === 'client' && req.user.clientId) {
                projectQuery.clientId = req.user.clientId;
            }
            else {
                projectQuery.members = req.user.userId;
            }
        }
        const Project = (await Promise.resolve().then(() => __importStar(require('../models/Project')))).default;
        const projects = await Project.find(projectQuery).select('_id name repoLocalPath githubRepoOwner githubRepoName');
        const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
        const teamMembers = await User.find({
            teamId: req.user.teamId,
            isActive: true
        }).select('_id firstName lastName');
        // Keep standard chat for backwards compatibility if needed
        const { chatWithAI } = await Promise.resolve().then(() => __importStar(require('../services/ai.service')));
        const result = await chatWithAI(messages, taskDraft || {}, projectId, projects, teamMembers);
        res.json(result);
    }
    catch (error) {
        console.error('AI chat route error:', error.message);
        res.status(500).json({ error: 'AI service error', message: error.message });
    }
});
exports.default = router;
