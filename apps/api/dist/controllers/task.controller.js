"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectTaskVerification = exports.approveTaskVerification = exports.stopTaskWork = exports.fixTaskBranch = exports.finishTaskWork = exports.resumeTaskWork = exports.pauseTaskWork = exports.startTaskWork = exports.downloadAttachment = exports.deleteAttachment = exports.uploadAttachment = exports.deleteTask = exports.updateTask = exports.createTask = exports.getTasks = void 0;
const Task_1 = __importDefault(require("../models/Task"));
const Project_1 = __importDefault(require("../models/Project"));
const GithubConfig_1 = __importDefault(require("../models/GithubConfig"));
const User_1 = __importDefault(require("../models/User"));
const task_schema_1 = require("@devmanager/shared/dist/task.schema");
const socket_1 = require("../socket");
const INTERNAL_ROLES = ['admin', 'manager', 'member'];
const isClarificationRequestPayload = (body) => {
    if (body?.status === 'clarified')
        return false;
    return (body?.status === 'clarification' ||
        body?.needsClarification === true ||
        (Object.prototype.hasOwnProperty.call(body || {}, 'clarificationText') &&
            !!body?.clarificationText));
};
async function createGithubBranch(token, owner, repo, branchName, baseBranch = 'dev') {
    try {
        // Ensure requested base branch exists. If missing, create it from default branch.
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
        });
        if (!repoRes.ok)
            return null;
        const repoData = await repoRes.json();
        const defaultBranch = repoData.default_branch || 'main';
        const baseRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(baseBranch)}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
        });
        let sha = null;
        if (baseRefRes.ok) {
            const baseRefData = await baseRefRes.json();
            sha = baseRefData.object?.sha || null;
        }
        else if (baseRefRes.status === 404) {
            const defaultRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(defaultBranch)}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
            });
            if (!defaultRefRes.ok)
                return null;
            const defaultRefData = await defaultRefRes.json();
            const defaultSha = defaultRefData.object?.sha;
            if (!defaultSha)
                return null;
            const createBaseRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ref: `refs/heads/${baseBranch}`, sha: defaultSha })
            });
            if (!createBaseRes.ok) {
                const createBaseErr = await createBaseRes.text();
                console.error('Failed to create base branch:', createBaseErr);
                return null;
            }
            sha = defaultSha;
        }
        else {
            return null;
        }
        if (!sha)
            return null;
        // Create task branch from base branch (dev)
        const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha })
        });
        if (!createRes.ok) {
            const errData = await createRes.json();
            if (createRes.status === 422 && typeof errData?.message === 'string' && errData.message.includes('Reference already exists')) {
                return branchName;
            }
            console.error('GitHub branch creation failed:', errData.message);
            return null;
        }
        return branchName;
    }
    catch (err) {
        console.error('createGithubBranch error:', err.message);
        return null;
    }
}
const slugify = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
const getElapsedSeconds = (startedAt) => {
    if (!startedAt)
        return 0;
    const started = new Date(startedAt).getTime();
    if (Number.isNaN(started))
        return 0;
    return Math.max(0, Math.floor((Date.now() - started) / 1000));
};
const getComputedWorkedSeconds = (task) => {
    const base = Number(task?.totalWorkedSeconds || 0);
    const runningExtra = task?.activeWorkerId && !task?.isWorkPaused
        ? getElapsedSeconds(task?.lastWorkStartedAt)
        : 0;
    return base + runningExtra;
};
const getEntityId = (value) => {
    return value?._id?.toString?.() || value?.toString?.() || null;
};
const toAttachmentMeta = (attachment) => ({
    name: attachment?.name,
    mimeType: attachment?.mimeType,
    size: attachment?.size,
    uploadedAt: attachment?.uploadedAt,
});
const hasTaskAccess = async (task, user) => {
    if (!task || !user)
        return false;
    if (user.role === 'admin')
        return true;
    if (!task.projectId)
        return false;
    if (user.role === 'client') {
        const project = await Project_1.default.findOne({ _id: task.projectId, clientId: user.clientId }).select('_id').lean();
        return Boolean(project);
    }
    const project = await Project_1.default.findOne({ _id: task.projectId, members: user.userId }).select('_id').lean();
    return Boolean(project);
};
const toTaskResponse = (task, viewer) => {
    const obj = typeof task?.toObject === 'function' ? task.toObject() : task;
    const activeWorkerId = getEntityId(obj?.activeWorkerId);
    const canViewWorkerIdentity = viewer?.role === 'admin';
    const isCurrentUserActiveWorker = Boolean(viewer?.userId && activeWorkerId && viewer.userId === activeWorkerId);
    const sanitized = {
        ...obj,
        attachments: Array.isArray(obj?.attachments) ? obj.attachments.map(toAttachmentMeta) : [],
        hasActiveWorker: Boolean(activeWorkerId),
        isCurrentUserActiveWorker
    };
    if (!canViewWorkerIdentity && activeWorkerId) {
        sanitized.activeWorkerId = isCurrentUserActiveWorker ? { _id: activeWorkerId } : null;
    }
    return {
        ...sanitized,
        totalWorkedSecondsComputed: getComputedWorkedSeconds(obj)
    };
};
const toTaskSocketPayload = (task) => {
    const obj = typeof task?.toObject === 'function' ? task.toObject() : task;
    return {
        _id: obj?._id,
        projectId: obj?.projectId
    };
};
const emitTaskEvent = (event, task) => {
    const payload = toTaskSocketPayload(task);
    if (!payload.projectId)
        return;
    (0, socket_1.emitToProject)(payload.projectId.toString(), event, payload);
};
const mergeWorkLog = (workLogs = [], userId, seconds) => {
    if (!seconds || seconds <= 0)
        return workLogs;
    const next = Array.isArray(workLogs) ? [...workLogs] : [];
    const idx = next.findIndex((entry) => {
        const id = entry?.userId?._id?.toString?.() || entry?.userId?.toString?.();
        return id === userId;
    });
    if (idx >= 0) {
        next[idx] = { ...next[idx], seconds: Number(next[idx].seconds || 0) + seconds };
    }
    else {
        next.push({ userId, seconds });
    }
    return next;
};
const pickRandom = (arr) => {
    if (!arr.length)
        return null;
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
};
const pickVerifierByPendingPreference = async (pool, currentTaskId) => {
    if (!pool.length)
        return null;
    const verifierIds = pool
        .map((user) => user?._id)
        .filter(Boolean);
    if (!verifierIds.length)
        return pickRandom(pool);
    const pendingLoads = await Task_1.default.aggregate([
        {
            $match: {
                _id: currentTaskId ? { $ne: currentTaskId } : { $exists: true },
                verifierId: { $in: verifierIds },
                verificationStatus: 'pending',
                status: 'under_verification',
            }
        },
        {
            $group: {
                _id: '$verifierId',
                count: { $sum: 1 }
            }
        }
    ]);
    const loadByVerifierId = new Map();
    for (const row of pendingLoads) {
        const id = row?._id?.toString?.();
        if (id)
            loadByVerifierId.set(id, Number(row?.count || 0));
    }
    const withLoad = pool.map((user) => {
        const id = user?._id?.toString?.();
        const load = id ? (loadByVerifierId.get(id) || 0) : 0;
        return { user, load };
    });
    const allZero = withLoad.every((entry) => entry.load === 0);
    if (allZero) {
        // Everyone is free: random assignment.
        return pickRandom(pool);
    }
    // Prefer users who already have pending verifications.
    const alreadyPending = withLoad
        .filter((entry) => entry.load > 0)
        .map((entry) => entry.user);
    if (alreadyPending.length > 0) {
        return pickRandom(alreadyPending);
    }
    let minLoad = Number.POSITIVE_INFINITY;
    const candidates = [];
    for (const entry of withLoad) {
        const load = entry.load;
        const user = entry.user;
        if (load < minLoad) {
            minLoad = load;
            candidates.length = 0;
            candidates.push(user);
        }
        else if (load === minLoad) {
            candidates.push(user);
        }
    }
    return pickRandom(candidates.length ? candidates : pool);
};
const getTaskTitleBranchSegment = (task) => {
    const raw = String(task?.title || '').trim();
    const slug = slugify(raw);
    return slug || `task-${task?._id?.toString?.().slice(-6) || 'untitled'}`;
};
const isTaskBranchFixed = (branch, taskTitleSegment) => {
    if (!branch || !taskTitleSegment)
        return false;
    const escapedTitle = taskTitleSegment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^tasks\\/[^/]+\\/(inprogress|done)\\/${escapedTitle}$`);
    return pattern.test(branch);
};
const extractUsernameFromLegacyBranch = (branch) => {
    if (!branch)
        return null;
    const tasksMatch = branch.match(/^tasks\/([^/]+)\//);
    if (tasksMatch?.[1])
        return tasksMatch[1];
    // Legacy pattern example: task/7d43a7-activity-log-zubair209
    if (branch.startsWith('task/')) {
        const tail = branch.split('/').pop() || '';
        const chunks = tail.split('-').filter(Boolean);
        if (chunks.length > 0)
            return chunks[chunks.length - 1];
    }
    return null;
};
async function restrictBranchToUser(token, owner, repo, branch, githubUsername) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}/protection`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify({
                required_status_checks: null,
                enforce_admins: null,
                required_pull_request_reviews: null,
                restrictions: { users: [githubUsername], teams: [], apps: [] },
                required_linear_history: false,
                allow_force_pushes: false,
                allow_deletions: false,
                block_creations: false,
                required_conversation_resolution: false,
                lock_branch: false,
                allow_fork_syncing: false
            })
        });
        if (!response.ok) {
            const data = await response.text();
            console.warn(`Unable to apply branch restriction for ${branch}:`, response.status, data);
            return false;
        }
        return true;
    }
    catch (error) {
        console.warn(`Branch restriction request failed for ${branch}:`, error?.message || error);
        return false;
    }
}
async function deleteGithubBranch(token, owner, repo, branch) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        // 204 = deleted, 422/404 can happen if branch already removed
        if (response.status === 204 || response.status === 404 || response.status === 422) {
            return true;
        }
        const body = await response.text();
        console.warn(`Failed to delete GitHub branch ${branch}:`, response.status, body);
        return false;
    }
    catch (error) {
        console.warn(`GitHub branch delete request failed for ${branch}:`, error?.message || error);
        return false;
    }
}
async function getGithubBranchSha(token, owner, repo, branch) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        if (response.status === 404)
            return null;
        if (!response.ok)
            return null;
        const data = await response.json();
        return data?.object?.sha || null;
    }
    catch {
        return null;
    }
}
async function moveGithubBranch(token, owner, repo, fromBranch, toBranch) {
    try {
        if (!fromBranch || !toBranch || fromBranch === toBranch)
            return { ok: true };
        const fromSha = await getGithubBranchSha(token, owner, repo, fromBranch);
        if (!fromSha) {
            return { ok: false, message: `Source branch ${fromBranch} does not exist` };
        }
        const targetSha = await getGithubBranchSha(token, owner, repo, toBranch);
        if (!targetSha) {
            const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ref: `refs/heads/${toBranch}`, sha: fromSha })
            });
            if (!createRes.ok) {
                const text = await createRes.text();
                return { ok: false, message: `Failed to create target branch ${toBranch}: ${text}` };
            }
        }
        const deleted = await deleteGithubBranch(token, owner, repo, fromBranch);
        if (!deleted) {
            return { ok: false, message: `Target branch created but failed to delete source branch ${fromBranch}` };
        }
        return { ok: true };
    }
    catch (error) {
        return { ok: false, message: error?.message || 'Failed to move branch' };
    }
}
async function mergeGithubBranches(token, owner, repo, base, head) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/merges`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify({
                base,
                head,
                commit_message: `chore: merge ${head} into ${base}`
            })
        });
        if (response.status === 201 || response.status === 204) {
            return { ok: true, status: response.status, message: `Merged ${head} into ${base}` };
        }
        const text = await response.text();
        const message = text || `Failed to merge ${head} into ${base}`;
        if (response.status === 409) {
            return { ok: false, conflict: true, status: 409, message, responseText: text };
        }
        return { ok: false, status: response.status, message, responseText: text };
    }
    catch (error) {
        return { ok: false, status: 500, message: error?.message || 'Merge request failed' };
    }
}
const buildGithubCompareUrl = (owner, repo, base, head) => {
    const encodedBase = encodeURIComponent(base);
    const encodedHead = encodeURIComponent(head);
    return `https://github.com/${owner}/${repo}/compare/${encodedBase}...${encodedHead}?expand=1`;
};
const buildGithubPullRequestUrl = (owner, repo, base, head) => {
    const encodedBase = encodeURIComponent(base);
    const encodedHead = encodeURIComponent(head);
    return `https://github.com/${owner}/${repo}/pull/new/${encodedBase}...${encodedHead}`;
};
const getTasks = async (req, res) => {
    try {
        const { projectId } = req.query;
        const query = {};
        if (req.user.role === 'admin') {
            // Admin sees all tasks (optionally filtered by project)
            if (projectId)
                query.projectId = projectId;
        }
        else if (req.user.role === 'client') {
            // Clients are linked to projects via clientId, not members[]
            const clientProjects = await Project_1.default.find({ clientId: req.user.clientId }).select('_id');
            const allowedProjectIds = clientProjects.map(p => p._id);
            if (projectId) {
                const allowed = allowedProjectIds.some(id => id.toString() === projectId);
                if (!allowed)
                    return res.json([]);
                query.projectId = projectId;
            }
            else {
                query.projectId = { $in: allowedProjectIds };
            }
        }
        else {
            // manager/member: projects where they are in members[]
            const memberProjects = await Project_1.default.find({ members: req.user.userId }).select('_id');
            const allowedProjectIds = memberProjects.map(p => p._id);
            if (projectId) {
                const allowed = allowedProjectIds.some(id => id.toString() === projectId);
                if (!allowed)
                    return res.json([]);
                query.projectId = projectId;
            }
            else {
                query.projectId = { $in: allowedProjectIds };
            }
        }
        const tasks = await Task_1.default.find(query)
            .select('-attachments.data')
            .populate('assigneeId', 'firstName lastName email')
            .populate('activeWorkerId', 'firstName lastName email role')
            .populate('verifierId', 'firstName lastName email role')
            .populate('workLogs.userId', 'firstName lastName email role');
        res.json(tasks.map((task) => toTaskResponse(task, req.user)));
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTasks = getTasks;
const createTask = async (req, res) => {
    try {
        const validated = task_schema_1.TaskSchema.parse(req.body);
        // Create task. Branch is created when someone starts work.
        const task = await Task_1.default.create({ ...validated });
        res.status(201).json(toTaskResponse(task, req.user));
        // Notify project room of new task
        emitTaskEvent('task:created', task);
    }
    catch (error) {
        if (error.issues)
            return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createTask = createTask;
const updateTask = async (req, res) => {
    try {
        const existingTask = await Task_1.default.findById(req.params.id);
        if (!existingTask)
            return res.status(404).json({ message: 'Task not found' });
        const clarificationRequest = isClarificationRequestPayload(req.body);
        if (clarificationRequest && !INTERNAL_ROLES.includes(req.user.role)) {
            return res.status(403).json({ message: 'Only admin and team members can request clarification' });
        }
        const patch = { ...req.body };
        if (clarificationRequest) {
            patch.status = 'clarification';
            patch.needsClarification = true;
        }
        if (patch.status === 'clarified') {
            patch.needsClarification = false;
        }
        if (typeof patch.status === 'string' && patch.status !== 'in_progress') {
            const elapsed = existingTask.activeWorkerId && !existingTask.isWorkPaused
                ? getElapsedSeconds(existingTask.lastWorkStartedAt)
                : 0;
            const activeWorkerId = existingTask.activeWorkerId?.toString?.();
            patch.totalWorkedSeconds = Number(existingTask.totalWorkedSeconds || 0) + elapsed;
            patch.workLogs = activeWorkerId
                ? mergeWorkLog(existingTask.workLogs, activeWorkerId, elapsed)
                : existingTask.workLogs;
            patch.activeWorkerId = null;
            patch.workStartedAt = null;
            patch.lastWorkStartedAt = null;
            patch.isWorkPaused = false;
            if (patch.status === 'done') {
                patch.finishedAt = new Date();
            }
        }
        const task = await Task_1.default.findByIdAndUpdate(req.params.id, patch, { new: true })
            .populate('assigneeId', 'firstName lastName email')
            .populate('activeWorkerId', 'firstName lastName email role')
            .populate('verifierId', 'firstName lastName email role')
            .populate('workLogs.userId', 'firstName lastName email role');
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        res.json(toTaskResponse(task, req.user));
        if (clarificationRequest && task.projectId) {
            (0, socket_1.emitToAll)('notification:created', {
                type: 'clarification_requested',
                taskId: task._id,
                projectId: task.projectId,
                title: task.title,
                message: `Clarification requested for task: ${task.title}`,
                recipientRoles: ['admin', 'client'],
                createdAt: new Date().toISOString(),
            });
        }
        // Notify project room of updated task
        emitTaskEvent('task:updated', task);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res) => {
    try {
        if (!INTERNAL_ROLES.includes(req.user.role)) {
            return res.status(403).json({ message: 'Only admin and team members can delete tasks' });
        }
        const task = await Task_1.default.findById(req.params.id);
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        // Best-effort cleanup: remove task branch from GitHub when task is deleted.
        if (task.githubBranch && task.projectId) {
            const project = await Project_1.default.findById(task.projectId).select('githubRepoOwner githubRepoName');
            const config = await GithubConfig_1.default.findOne().select('personalAccessToken');
            if (project?.githubRepoOwner && project?.githubRepoName && config?.personalAccessToken) {
                await deleteGithubBranch(config.personalAccessToken, project.githubRepoOwner, project.githubRepoName, task.githubBranch);
            }
        }
        await Task_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task deleted' });
        if (task.projectId) {
            (0, socket_1.emitToProject)(task.projectId.toString(), 'task:deleted', {
                _id: task._id,
                projectId: task.projectId,
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteTask = deleteTask;
const uploadAttachment = async (req, res) => {
    try {
        const { name, mimeType, size, data } = req.body;
        if (!name || !mimeType || !data) {
            return res.status(400).json({ message: 'name, mimeType, and data are required' });
        }
        // 5 MB limit on base64 string (~3.7MB raw file)
        if (data.length > 5 * 1024 * 1024 * 1.4) {
            return res.status(413).json({ message: 'File too large. Max 5 MB.' });
        }
        const task = await Task_1.default.findByIdAndUpdate(req.params.id, { $push: { attachments: { name, mimeType, size, data, uploadedAt: new Date() } } }, { new: true })
            .populate('assigneeId', 'firstName lastName email')
            .populate('activeWorkerId', 'firstName lastName email role')
            .populate('verifierId', 'firstName lastName email role')
            .populate('workLogs.userId', 'firstName lastName email role');
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        res.json(toTaskResponse(task, req.user));
        emitTaskEvent('task:updated', task);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.uploadAttachment = uploadAttachment;
const deleteAttachment = async (req, res) => {
    try {
        const { attachmentIndex } = req.params;
        const task = await Task_1.default.findById(req.params.id);
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        const idx = parseInt(attachmentIndex, 10);
        if (isNaN(idx) || !task.attachments || idx < 0 || idx >= task.attachments.length) {
            return res.status(400).json({ message: 'Invalid attachment index' });
        }
        task.attachments.splice(idx, 1);
        await task.save();
        await task.populate('assigneeId', 'firstName lastName email');
        await task.populate('activeWorkerId', 'firstName lastName email role');
        await task.populate('verifierId', 'firstName lastName email role');
        await task.populate('workLogs.userId', 'firstName lastName email role');
        res.json(toTaskResponse(task, req.user));
        emitTaskEvent('task:updated', task);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteAttachment = deleteAttachment;
const downloadAttachment = async (req, res) => {
    try {
        const { attachmentIndex } = req.params;
        const task = await Task_1.default.findById(req.params.id);
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        const allowed = await hasTaskAccess(task, req.user);
        if (!allowed)
            return res.status(403).json({ message: 'Not authorized' });
        const idx = parseInt(attachmentIndex, 10);
        if (isNaN(idx) || !task.attachments || idx < 0 || idx >= task.attachments.length) {
            return res.status(400).json({ message: 'Invalid attachment index' });
        }
        const att = task.attachments[idx];
        res.json({
            index: idx,
            name: att.name,
            mimeType: att.mimeType,
            size: att.size,
            data: att.data,
            uploadedAt: att.uploadedAt,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.downloadAttachment = downloadAttachment;
const startTaskWork = async (req, res) => {
    try {
        if (!INTERNAL_ROLES.includes(req.user.role)) {
            return res.status(403).json({ message: 'Only admin and team members can start work on tasks' });
        }
        const task = await Task_1.default.findById(req.params.id).populate('activeWorkerId', 'firstName lastName email role');
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        if (task.verificationStatus === 'pending' || task.status === 'under_verification') {
            return res.status(400).json({ message: 'Task is under verification and cannot be started' });
        }
        const currentWorker = task.activeWorkerId;
        const currentWorkerId = currentWorker?._id?.toString?.() || currentWorker?.toString?.();
        if (currentWorkerId && currentWorkerId !== req.user.userId) {
            const fullName = `${currentWorker?.firstName || ''} ${currentWorker?.lastName || ''}`.trim();
            return res.status(409).json({
                message: req.user.role === 'admin'
                    ? `Task is already being worked on by ${fullName || currentWorker?.email || 'another user'}.`
                    : 'Task is already in progress.'
            });
        }
        const patch = {
            activeWorkerId: req.user.userId,
            status: 'in_progress',
            isWorkPaused: false,
            finishedAt: null
        };
        const now = new Date();
        if (!task.workStartedAt)
            patch.workStartedAt = now;
        if (task.isWorkPaused || !task.lastWorkStartedAt)
            patch.lastWorkStartedAt = now;
        // On start: create user-specific GitHub branch for this task.
        if (task.projectId && !task.githubBranch) {
            const project = await Project_1.default.findById(task.projectId).select('githubRepoOwner githubRepoName');
            const config = await GithubConfig_1.default.findOne().select('personalAccessToken');
            const user = await User_1.default.findById(req.user.userId).select('githubUsername');
            if (project?.githubRepoOwner && project?.githubRepoName) {
                if (!config?.personalAccessToken) {
                    return res.status(400).json({ message: 'GitHub integration is not connected. Cannot start task.' });
                }
                if (!user?.githubUsername) {
                    return res.status(400).json({ message: 'Your GitHub account is not set up. Cannot start task.' });
                }
                const taskTitleSegment = getTaskTitleBranchSegment(task);
                const branchName = `tasks/${slugify(user.githubUsername)}/inprogress/${taskTitleSegment}`;
                const createdBranch = await createGithubBranch(config.personalAccessToken, project.githubRepoOwner, project.githubRepoName, branchName, 'dev');
                if (!createdBranch) {
                    return res.status(400).json({ message: 'Failed to create GitHub branch. Task was not started.' });
                }
                const restricted = await restrictBranchToUser(config.personalAccessToken, project.githubRepoOwner, project.githubRepoName, createdBranch, user.githubUsername);
                if (!restricted) {
                    // Best effort only: do not block task start if branch restriction cannot be enforced.
                    console.warn(`Proceeding without branch restriction for ${createdBranch}`);
                }
                patch.githubBranch = createdBranch;
            }
        }
        const updated = await Task_1.default.findByIdAndUpdate(req.params.id, patch, { new: true })
            .populate('assigneeId', 'firstName lastName email')
            .populate('activeWorkerId', 'firstName lastName email role')
            .populate('verifierId', 'firstName lastName email role')
            .populate('workLogs.userId', 'firstName lastName email role');
        if (!updated)
            return res.status(404).json({ message: 'Task not found' });
        res.json(toTaskResponse(updated, req.user));
        emitTaskEvent('task:updated', updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.startTaskWork = startTaskWork;
const pauseTaskWork = async (req, res) => {
    try {
        if (!INTERNAL_ROLES.includes(req.user.role)) {
            return res.status(403).json({ message: 'Only admin and team members can pause work on tasks' });
        }
        const task = await Task_1.default.findById(req.params.id).populate('activeWorkerId', 'firstName lastName email role');
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        const currentWorker = task.activeWorkerId;
        const currentWorkerId = currentWorker?._id?.toString?.() || currentWorker?.toString?.();
        if (!currentWorkerId) {
            return res.status(400).json({ message: 'Task is not currently in progress' });
        }
        const canPause = currentWorkerId === req.user.userId || ['admin', 'manager'].includes(req.user.role);
        if (!canPause) {
            return res.status(403).json({ message: 'Only the active worker, manager, or admin can pause this task' });
        }
        if (task.isWorkPaused) {
            return res.status(400).json({ message: 'Task is already paused' });
        }
        const elapsed = getElapsedSeconds(task.lastWorkStartedAt);
        const workLogs = mergeWorkLog(task.workLogs, currentWorkerId, elapsed);
        const updated = await Task_1.default.findByIdAndUpdate(req.params.id, {
            totalWorkedSeconds: Number(task.totalWorkedSeconds || 0) + elapsed,
            workLogs,
            isWorkPaused: true,
            lastWorkStartedAt: null,
        }, { new: true })
            .populate('assigneeId', 'firstName lastName email')
            .populate('activeWorkerId', 'firstName lastName email role')
            .populate('verifierId', 'firstName lastName email role')
            .populate('workLogs.userId', 'firstName lastName email role');
        if (!updated)
            return res.status(404).json({ message: 'Task not found' });
        res.json(toTaskResponse(updated, req.user));
        emitTaskEvent('task:updated', updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.pauseTaskWork = pauseTaskWork;
const resumeTaskWork = async (req, res) => {
    try {
        if (!INTERNAL_ROLES.includes(req.user.role)) {
            return res.status(403).json({ message: 'Only admin and team members can resume work on tasks' });
        }
        const task = await Task_1.default.findById(req.params.id).populate('activeWorkerId', 'firstName lastName email role');
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        if (task.verificationStatus === 'pending' || task.status === 'under_verification') {
            return res.status(400).json({ message: 'Task is under verification and cannot be resumed' });
        }
        const currentWorker = task.activeWorkerId;
        const currentWorkerId = currentWorker?._id?.toString?.() || currentWorker?.toString?.();
        if (!currentWorkerId) {
            return res.status(400).json({ message: 'Task is not assigned to an active worker' });
        }
        const canResume = currentWorkerId === req.user.userId || ['admin', 'manager'].includes(req.user.role);
        if (!canResume) {
            return res.status(403).json({ message: 'Only the active worker, manager, or admin can resume this task' });
        }
        if (!task.isWorkPaused) {
            return res.status(400).json({ message: 'Task is already running' });
        }
        const updated = await Task_1.default.findByIdAndUpdate(req.params.id, {
            isWorkPaused: false,
            lastWorkStartedAt: new Date(),
            status: 'in_progress'
        }, { new: true })
            .populate('assigneeId', 'firstName lastName email')
            .populate('activeWorkerId', 'firstName lastName email role')
            .populate('verifierId', 'firstName lastName email role')
            .populate('workLogs.userId', 'firstName lastName email role');
        if (!updated)
            return res.status(404).json({ message: 'Task not found' });
        res.json(toTaskResponse(updated, req.user));
        emitTaskEvent('task:updated', updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.resumeTaskWork = resumeTaskWork;
const finishTaskWork = async (req, res) => {
    try {
        if (!INTERNAL_ROLES.includes(req.user.role)) {
            return res.status(403).json({ message: 'Only admin and team members can finish tasks' });
        }
        const task = await Task_1.default.findById(req.params.id).populate('activeWorkerId', 'firstName lastName email role');
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        const currentWorker = task.activeWorkerId;
        const currentWorkerId = currentWorker?._id?.toString?.() || currentWorker?.toString?.();
        if (!currentWorkerId) {
            return res.status(400).json({ message: 'Task is not currently assigned to an active worker' });
        }
        const canFinish = currentWorkerId === req.user.userId || ['admin', 'manager'].includes(req.user.role);
        if (!canFinish) {
            return res.status(403).json({ message: 'Only the active worker, manager, or admin can finish this task' });
        }
        const elapsed = task.isWorkPaused ? 0 : getElapsedSeconds(task.lastWorkStartedAt);
        const workLogs = mergeWorkLog(task.workLogs, currentWorkerId, elapsed);
        const finishContext = {
            taskId: task._id?.toString?.(),
            projectId: task.projectId?.toString?.(),
            actorUserId: req.user.userId,
            branch: task.githubBranch || null,
        };
        const project = await Project_1.default.findById(task.projectId).select('members githubRepoOwner githubRepoName');
        if (task.githubBranch && project?.githubRepoOwner && project?.githubRepoName) {
            const config = await GithubConfig_1.default.findOne().select('personalAccessToken');
            if (!config?.personalAccessToken) {
                return res.status(400).json({ message: 'GitHub integration is not connected. Cannot complete task merge flow.' });
            }
            const taskBranch = task.githubBranch;
            const mergeDevToTask = await mergeGithubBranches(config.personalAccessToken, project.githubRepoOwner, project.githubRepoName, taskBranch, 'dev');
            if (!mergeDevToTask.ok) {
                console.error('finishTaskWork merge failed (dev->task)', {
                    ...finishContext,
                    mergeStep: 'dev_to_task',
                    status: mergeDevToTask.status,
                    conflict: !!mergeDevToTask.conflict,
                    details: mergeDevToTask.message,
                    responseText: mergeDevToTask.responseText || null,
                });
                if (mergeDevToTask.conflict) {
                    const compareUrl = buildGithubCompareUrl(project.githubRepoOwner, project.githubRepoName, taskBranch, 'dev');
                    const pullRequestUrl = buildGithubPullRequestUrl(project.githubRepoOwner, project.githubRepoName, taskBranch, 'dev');
                    return res.status(409).json({
                        code: 'merge_conflict_dev_to_task',
                        mergeStep: 'dev_to_task',
                        message: `Merge conflict detected while updating ${taskBranch} from dev. Please resolve conflicts in your branch, push, and finish task again.`,
                        details: mergeDevToTask.message,
                        branch: taskBranch,
                        compareUrl,
                        pullRequestUrl,
                        resolveUrl: compareUrl
                    });
                }
                return res.status(400).json({
                    code: 'merge_failed_dev_to_task',
                    mergeStep: 'dev_to_task',
                    message: `Failed to update ${taskBranch} from dev before verification.`,
                    details: mergeDevToTask.message
                });
            }
            const mergeTaskToDev = await mergeGithubBranches(config.personalAccessToken, project.githubRepoOwner, project.githubRepoName, 'dev', taskBranch);
            if (!mergeTaskToDev.ok) {
                console.error('finishTaskWork merge failed (task->dev)', {
                    ...finishContext,
                    mergeStep: 'task_to_dev',
                    status: mergeTaskToDev.status,
                    conflict: !!mergeTaskToDev.conflict,
                    details: mergeTaskToDev.message,
                    responseText: mergeTaskToDev.responseText || null,
                });
                if (mergeTaskToDev.conflict) {
                    const compareUrl = buildGithubCompareUrl(project.githubRepoOwner, project.githubRepoName, 'dev', taskBranch);
                    const pullRequestUrl = buildGithubPullRequestUrl(project.githubRepoOwner, project.githubRepoName, 'dev', taskBranch);
                    return res.status(409).json({
                        code: 'merge_conflict_task_to_dev',
                        mergeStep: 'task_to_dev',
                        message: `Merge conflict detected while merging ${taskBranch} into dev. Please resolve conflicts and finish task again.`,
                        details: mergeTaskToDev.message,
                        branch: taskBranch,
                        compareUrl,
                        pullRequestUrl,
                        resolveUrl: compareUrl
                    });
                }
                return res.status(400).json({
                    code: 'merge_failed_task_to_dev',
                    mergeStep: 'task_to_dev',
                    message: `Failed to merge ${taskBranch} into dev before verification.`,
                    details: mergeTaskToDev.message
                });
            }
        }
        const eligibleQuery = {
            role: { $in: ['manager', 'member'] },
            isActive: true,
            canVerifyTasks: true
        };
        const eligibleProjectTesters = project?.members?.length
            ? await User_1.default.find({
                _id: { $in: project.members, $ne: currentWorkerId },
                ...eligibleQuery
            }).select('_id')
            : [];
        const eligibleGlobalTesters = await User_1.default.find({
            _id: { $ne: currentWorkerId },
            ...eligibleQuery
        }).select('_id');
        const pool = eligibleProjectTesters.length ? eligibleProjectTesters : eligibleGlobalTesters;
        if (!pool.length) {
            return res.status(400).json({ message: 'No eligible tester available besides the user who finished the task' });
        }
        const selectedVerifier = await pickVerifierByPendingPreference(pool, task._id?.toString?.());
        if (!selectedVerifier?._id) {
            return res.status(400).json({ message: 'Failed to assign verifier' });
        }
        const updated = await Task_1.default.findByIdAndUpdate(req.params.id, {
            totalWorkedSeconds: Number(task.totalWorkedSeconds || 0) + elapsed,
            workLogs,
            activeWorkerId: null,
            lastWorkStartedAt: null,
            isWorkPaused: false,
            status: 'under_verification',
            finishedAt: new Date(),
            verificationStatus: 'pending',
            verifierId: selectedVerifier._id,
            verificationComment: null,
            verificationDecidedAt: null,
        }, { new: true })
            .populate('assigneeId', 'firstName lastName email')
            .populate('activeWorkerId', 'firstName lastName email role')
            .populate('verifierId', 'firstName lastName email role')
            .populate('workLogs.userId', 'firstName lastName email role');
        if (!updated)
            return res.status(404).json({ message: 'Task not found' });
        res.json(toTaskResponse(updated, req.user));
        emitTaskEvent('task:updated', updated);
    }
    catch (error) {
        console.error('finishTaskWork server error', {
            taskId: req.params.id,
            actorUserId: req.user?.userId,
            error: error?.message || error,
        });
        res.status(500).json({ message: 'Server error' });
    }
};
exports.finishTaskWork = finishTaskWork;
const fixTaskBranch = async (req, res) => {
    try {
        if (!INTERNAL_ROLES.includes(req.user.role)) {
            return res.status(403).json({ message: 'Only admin and team members can fix task branches' });
        }
        const task = await Task_1.default.findById(req.params.id)
            .populate('assigneeId', 'firstName lastName email')
            .populate('activeWorkerId', 'firstName lastName email role')
            .populate('verifierId', 'firstName lastName email role')
            .populate('workLogs.userId', 'firstName lastName email role');
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        if (!task.githubBranch) {
            return res.status(400).json({ message: 'No branch to fix for this task' });
        }
        const hasStarted = Boolean(task.activeWorkerId ||
            task.workStartedAt ||
            task.lastWorkStartedAt ||
            Number(task.totalWorkedSeconds || 0) > 0);
        if (hasStarted) {
            return res.status(400).json({ message: 'Branch can only be fixed before task work starts' });
        }
        const taskTitleSegment = getTaskTitleBranchSegment(task);
        if (isTaskBranchFixed(task.githubBranch, taskTitleSegment)) {
            return res.json(toTaskResponse(task, req.user));
        }
        const project = await Project_1.default.findById(task.projectId).select('githubRepoOwner githubRepoName');
        if (!project?.githubRepoOwner || !project?.githubRepoName) {
            return res.status(400).json({ message: 'Project repository is not linked' });
        }
        const config = await GithubConfig_1.default.findOne().select('personalAccessToken');
        if (!config?.personalAccessToken) {
            return res.status(400).json({ message: 'GitHub integration is not connected' });
        }
        const actor = await User_1.default.findById(req.user.userId).select('githubUsername');
        const branchUsername = extractUsernameFromLegacyBranch(task.githubBranch)
            || (actor?.githubUsername ? slugify(actor.githubUsername) : '');
        if (!branchUsername) {
            return res.status(400).json({ message: 'Unable to detect branch username for this task' });
        }
        const targetBranch = `tasks/${branchUsername}/inprogress/${taskTitleSegment}`;
        const moved = await moveGithubBranch(config.personalAccessToken, project.githubRepoOwner, project.githubRepoName, task.githubBranch, targetBranch);
        if (!moved.ok) {
            return res.status(400).json({ message: moved.message || 'Failed to fix branch' });
        }
        task.githubBranch = targetBranch;
        await task.save();
        await task.populate('assigneeId', 'firstName lastName email');
        await task.populate('activeWorkerId', 'firstName lastName email role');
        await task.populate('verifierId', 'firstName lastName email role');
        await task.populate('workLogs.userId', 'firstName lastName email role');
        res.json(toTaskResponse(task, req.user));
        emitTaskEvent('task:updated', task);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.fixTaskBranch = fixTaskBranch;
exports.stopTaskWork = exports.pauseTaskWork;
const approveTaskVerification = async (req, res) => {
    try {
        if (!INTERNAL_ROLES.includes(req.user.role)) {
            return res.status(403).json({ message: 'Only team members can verify tasks' });
        }
        const task = await Task_1.default.findById(req.params.id).populate('verifierId', 'firstName lastName email role');
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        if (task.verificationStatus !== 'pending') {
            return res.status(400).json({ message: 'Task is not pending verification' });
        }
        const verifierId = task.verifierId?._id?.toString?.() || task.verifierId?.toString?.();
        const canVerify = verifierId === req.user.userId || ['admin', 'manager'].includes(req.user.role);
        if (!canVerify) {
            return res.status(403).json({ message: 'Only assigned verifier can approve this task' });
        }
        let nextGithubBranch = task.githubBranch;
        if (task.githubBranch) {
            const project = await Project_1.default.findById(task.projectId).select('githubRepoOwner githubRepoName');
            const config = await GithubConfig_1.default.findOne().select('personalAccessToken');
            if (project?.githubRepoOwner && project?.githubRepoName && config?.personalAccessToken) {
                const parts = task.githubBranch.split('/');
                const branchUsername = parts.length >= 2 && parts[0] === 'tasks' ? parts[1] : null;
                if (branchUsername) {
                    const taskTitleSegment = getTaskTitleBranchSegment(task);
                    const targetDoneBranch = `tasks/${branchUsername}/done/${taskTitleSegment}`;
                    const moved = await moveGithubBranch(config.personalAccessToken, project.githubRepoOwner, project.githubRepoName, task.githubBranch, targetDoneBranch);
                    if (!moved.ok) {
                        return res.status(400).json({
                            message: `Task verified but branch move failed. ${moved.message || 'Unknown error'}`,
                        });
                    }
                    nextGithubBranch = targetDoneBranch;
                }
            }
        }
        const updated = await Task_1.default.findByIdAndUpdate(req.params.id, {
            status: 'done',
            verificationStatus: 'approved',
            verificationComment: req.body?.comment || null,
            verificationDecidedAt: new Date(),
            githubBranch: nextGithubBranch,
        }, { new: true })
            .populate('assigneeId', 'firstName lastName email')
            .populate('activeWorkerId', 'firstName lastName email role')
            .populate('verifierId', 'firstName lastName email role')
            .populate('workLogs.userId', 'firstName lastName email role');
        if (!updated)
            return res.status(404).json({ message: 'Task not found' });
        res.json(toTaskResponse(updated, req.user));
        emitTaskEvent('task:updated', updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.approveTaskVerification = approveTaskVerification;
const rejectTaskVerification = async (req, res) => {
    try {
        if (!INTERNAL_ROLES.includes(req.user.role)) {
            return res.status(403).json({ message: 'Only team members can verify tasks' });
        }
        const task = await Task_1.default.findById(req.params.id).populate('verifierId', 'firstName lastName email role');
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        if (task.verificationStatus !== 'pending') {
            return res.status(400).json({ message: 'Task is not pending verification' });
        }
        const verifierId = task.verifierId?._id?.toString?.() || task.verifierId?.toString?.();
        const canVerify = verifierId === req.user.userId || ['admin', 'manager'].includes(req.user.role);
        if (!canVerify) {
            return res.status(403).json({ message: 'Only assigned verifier can reject this task' });
        }
        const updated = await Task_1.default.findByIdAndUpdate(req.params.id, {
            verificationStatus: 'rejected',
            verificationComment: req.body?.comment || null,
            verificationDecidedAt: new Date(),
            status: 'review',
            finishedAt: null,
        }, { new: true })
            .populate('assigneeId', 'firstName lastName email')
            .populate('activeWorkerId', 'firstName lastName email role')
            .populate('verifierId', 'firstName lastName email role')
            .populate('workLogs.userId', 'firstName lastName email role');
        if (!updated)
            return res.status(404).json({ message: 'Task not found' });
        res.json(toTaskResponse(updated, req.user));
        emitTaskEvent('task:updated', updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.rejectTaskVerification = rejectTaskVerification;
