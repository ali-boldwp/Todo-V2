"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadProjectDocument = exports.deleteProjectDocument = exports.uploadProjectDocument = exports.removeProjectMember = exports.triggerProjectDockployDeploy = exports.getProjectDockployStatus = exports.getProjectRepoStatus = exports.fixProjectRepo = exports.addProjectMember = exports.deleteProject = exports.updateProject = exports.getProject = exports.createProject = exports.getProjects = void 0;
const Project_1 = __importDefault(require("../models/Project"));
const GithubConfig_1 = __importDefault(require("../models/GithubConfig"));
const DockployConfig_1 = __importDefault(require("../models/DockployConfig"));
const User_1 = __importDefault(require("../models/User"));
const project_schema_1 = require("@devmanager/shared/dist/project.schema");
const socket_1 = require("../socket");
const notification_service_1 = require("../services/notification.service");
const ACCESS_FIELD_KEYS = ['projectUrl', 'devWebsiteUrl', 'accessAccounts'];
const DOCKPLOY_FIELD_KEYS = ['dockployAppId', 'dockployAutoDeploy'];
const MEMBER_ALLOWED_UPDATE_KEYS = ['description'];
const hasProjectAccessFieldInPayload = (payload) => ACCESS_FIELD_KEYS.some((key) => Object.prototype.hasOwnProperty.call(payload || {}, key));
const hasDockployFieldInPayload = (payload) => DOCKPLOY_FIELD_KEYS.some((key) => Object.prototype.hasOwnProperty.call(payload || {}, key));
const hasAnyKeyOutsideAllowList = (payload, allowed) => {
    const keys = Object.keys(payload || {});
    return keys.some((key) => !allowed.includes(key));
};
const sanitizeProjectForViewer = (project, role) => {
    const obj = typeof project?.toObject === 'function' ? project.toObject() : project;
    if (role === 'admin')
        return obj;
    if (role === 'client') {
        const { devWebsiteUrl, accessAccounts, ...rest } = obj || {};
        return rest;
    }
    const { projectUrl, accessAccounts, ...rest } = obj || {};
    return rest;
};
const ensureProjectAccess = (project, user) => {
    if (!project || !user)
        return false;
    if (user.role === 'admin')
        return true;
    if (user.role === 'client')
        return project.clientId?.toString?.() === user.clientId;
    if (user.role === 'manager' || user.role === 'member') {
        return project.members?.some?.((member) => member?.toString?.() === user.userId);
    }
    return false;
};
const buildProjectLink = (projectId) => (projectId ? `/projects/${projectId.toString()}/overview` : undefined);
const notifyProjectAudience = async (input) => {
    if (!input.project?._id)
        return;
    const audience = await (0, notification_service_1.getProjectRelatedUserIds)(input.project._id);
    await (0, notification_service_1.createAndDispatchNotifications)({
        recipientIds: [...audience, ...(input.recipientIds || [])],
        actorUserId: input.actorUserId,
        projectId: input.project._id,
        type: input.type,
        title: input.title,
        message: input.message,
        link: buildProjectLink(input.project._id),
    });
};
const getRepoDetails = async (token, owner, repo) => {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch repository ${owner}/${repo}: ${response.status} ${errorText}`);
    }
    return response.json();
};
const getBranchSha = async (token, owner, repo, branch) => {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
        },
    });
    if (response.status === 404)
        return null;
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch branch ${branch} for ${owner}/${repo}: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    return data?.object?.sha || null;
};
const createBranch = async (token, owner, repo, branch, sha) => {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create ${branch} branch in ${owner}/${repo}: ${response.status} ${errorText}`);
    }
};
const ensureDevBranch = async (token, owner, repo) => {
    const existingDevSha = await getBranchSha(token, owner, repo, 'dev');
    if (existingDevSha)
        return { created: false, branch: 'dev' };
    const repoDetails = await getRepoDetails(token, owner, repo);
    const defaultBranch = repoDetails?.default_branch || 'main';
    const defaultBranchSha = await getBranchSha(token, owner, repo, defaultBranch);
    if (!defaultBranchSha) {
        throw new Error(`Unable to resolve default branch SHA (${defaultBranch}) for ${owner}/${repo}`);
    }
    await createBranch(token, owner, repo, 'dev', defaultBranchSha);
    return { created: true, branch: 'dev' };
};
const applyDockployPathTemplate = (template, appId) => template.replace('{appId}', encodeURIComponent(appId));
const isAscii = (value) => /^[\x00-\x7F]*$/.test(value);
const requestDockploy = async (config, path, method, body) => {
    if (!config.apiToken || !isAscii(config.apiToken)) {
        return {
            ok: false,
            status: 400,
            data: { message: 'Invalid Dockploy API token format. Re-save token as plain ASCII text.' }
        };
    }
    const url = `${config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const authHeaderCandidates = [
        { Authorization: `Bearer ${config.apiToken}` },
        { 'x-api-key': config.apiToken },
        { Authorization: config.apiToken },
    ];
    let lastResult = { ok: false, status: 500, data: null };
    for (const authHeaders of authHeaderCandidates) {
        const response = await fetch(url, {
            method,
            headers: {
                ...authHeaders,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
        });
        const text = await response.text();
        let parsed = null;
        try {
            parsed = text ? JSON.parse(text) : null;
        }
        catch {
            parsed = text || null;
        }
        const result = { ok: response.ok, status: response.status, data: parsed };
        if (result.ok)
            return result;
        lastResult = result;
    }
    return lastResult;
};
const getProjects = async (req, res) => {
    try {
        const query = {};
        if (req.user.role !== 'admin') {
            if (req.user.role === 'client' && req.user.clientId) {
                query.clientId = req.user.clientId;
            }
            else {
                // manager/member: only projects they are explicitly assigned to
                query.members = req.user.userId;
            }
        }
        const projects = await Project_1.default.find(query)
            .select('-documents.fileData')
            .populate('clientId', 'name');
        res.json(projects.map((project) => sanitizeProjectForViewer(project, req.user.role)));
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getProjects = getProjects;
const createProject = async (req, res) => {
    try {
        const validated = project_schema_1.ProjectSchema.parse(req.body);
        let clientId = validated.clientId;
        if (req.user.role === 'client') {
            clientId = req.user.clientId?.toString();
        }
        let githubRepoOwner = validated.githubRepoOwner;
        let githubRepoName = validated.githubRepoName;
        if (validated.createGithubRepo) {
            const config = await GithubConfig_1.default.findOne();
            if (config && config.personalAccessToken) {
                const safeName = validated.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
                const response = await fetch('https://api.github.com/user/repos', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${config.personalAccessToken}`,
                        Accept: 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: safeName, private: true })
                });
                if (response.ok) {
                    const repoData = await response.json();
                    githubRepoOwner = repoData.owner.login;
                    githubRepoName = repoData.name;
                }
                else {
                    const errorText = await response.text();
                    console.error('createProject - GitHub Repo Creation Error:', response.status, errorText);
                    return res.status(400).json({ message: 'Failed to create GitHub repository. ' + errorText });
                }
            }
            else {
                return res.status(400).json({ message: 'GitHub integration is not connected.' });
            }
        }
        if (githubRepoOwner && githubRepoName) {
            const config = await GithubConfig_1.default.findOne();
            if (!config?.personalAccessToken) {
                return res.status(400).json({ message: 'GitHub integration is not connected.' });
            }
            try {
                await ensureDevBranch(config.personalAccessToken, githubRepoOwner, githubRepoName);
            }
            catch (error) {
                return res.status(400).json({ message: error?.message || 'Failed to ensure dev branch for repository' });
            }
        }
        const project = await Project_1.default.create({
            ...validated,
            clientId,
            githubRepoOwner,
            githubRepoName,
            dockployAppId: req.body?.dockployAppId ? String(req.body.dockployAppId).trim() : undefined,
            dockployAutoDeploy: Boolean(req.body?.dockployAutoDeploy),
        });
        await notifyProjectAudience({
            project,
            actorUserId: req.user.userId,
            type: 'project_created',
            title: 'Project Created',
            message: `Project "${project.name}" was created.`,
        });
        res.status(201).json(project);
    }
    catch (error) {
        if (error.issues)
            return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createProject = createProject;
const getProject = async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (req.user.role !== 'admin') {
            if (req.user.role === 'client') {
                query.clientId = req.user.clientId;
            }
            else {
                query.members = req.user.userId;
            }
        }
        const project = await Project_1.default.findOne(query)
            .select('-documents.fileData')
            .populate('clientId', 'name')
            .populate('members', 'firstName lastName email role')
            .populate('documents.uploadedBy', 'firstName lastName email');
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        res.json(sanitizeProjectForViewer(project, req.user.role));
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getProject = getProject;
const updateProject = async (req, res) => {
    try {
        const existingProject = await Project_1.default.findById(req.params.id).select('_id clientId members');
        if (!existingProject)
            return res.status(404).json({ message: 'Project not found' });
        if (!ensureProjectAccess(existingProject, req.user)) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Clients cannot update projects' });
        }
        if (req.user.role === 'member' && hasAnyKeyOutsideAllowList(req.body || {}, MEMBER_ALLOWED_UPDATE_KEYS)) {
            return res.status(403).json({ message: 'Members can only update project overview content' });
        }
        if (req.user.role !== 'admin' && hasProjectAccessFieldInPayload(req.body || {})) {
            return res.status(403).json({ message: 'Only admin can update project access credentials' });
        }
        if (req.user.role !== 'admin' && hasDockployFieldInPayload(req.body || {})) {
            return res.status(403).json({ message: 'Only admin can update Dockploy settings' });
        }
        const validated = project_schema_1.ProjectSchema.partial().parse(req.body);
        let githubRepoOwner = validated.githubRepoOwner;
        let githubRepoName = validated.githubRepoName;
        if (validated.createGithubRepo && validated.name) {
            const config = await GithubConfig_1.default.findOne();
            if (config && config.personalAccessToken) {
                const safeName = validated.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
                const response = await fetch('https://api.github.com/user/repos', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${config.personalAccessToken}`,
                        Accept: 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: safeName, private: true })
                });
                if (response.ok) {
                    const repoData = await response.json();
                    githubRepoOwner = repoData.owner.login;
                    githubRepoName = repoData.name;
                    console.log('updateProject - Repo created successfully:', githubRepoOwner, githubRepoName);
                }
                else {
                    const errorText = await response.text();
                    console.error('updateProject - GitHub Repo Creation Error:', response.status, errorText);
                    return res.status(400).json({ message: 'Failed to create GitHub repository. ' + errorText });
                }
            }
            else {
                return res.status(400).json({ message: 'GitHub integration is not connected.' });
            }
        }
        const updateData = { ...validated };
        // Allow explicit clearing of repo linkage from project settings.
        if (Object.prototype.hasOwnProperty.call(validated, 'githubRepoOwner')) {
            updateData.githubRepoOwner = githubRepoOwner || undefined;
        }
        if (Object.prototype.hasOwnProperty.call(validated, 'githubRepoName')) {
            updateData.githubRepoName = githubRepoName || undefined;
        }
        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'dockployAppId')) {
            updateData.dockployAppId = req.body?.dockployAppId ? String(req.body.dockployAppId).trim() : undefined;
        }
        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'dockployAutoDeploy')) {
            updateData.dockployAutoDeploy = Boolean(req.body?.dockployAutoDeploy);
        }
        if (updateData.githubRepoOwner && updateData.githubRepoName) {
            const config = await GithubConfig_1.default.findOne();
            if (!config?.personalAccessToken) {
                return res.status(400).json({ message: 'GitHub integration is not connected.' });
            }
            try {
                await ensureDevBranch(config.personalAccessToken, updateData.githubRepoOwner, updateData.githubRepoName);
            }
            catch (error) {
                return res.status(400).json({ message: error?.message || 'Failed to ensure dev branch for repository' });
            }
        }
        const project = await Project_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        await notifyProjectAudience({
            project,
            actorUserId: req.user.userId,
            type: 'project_updated',
            title: 'Project Updated',
            message: `Project "${project.name}" was updated.`,
        });
        res.json(sanitizeProjectForViewer(project, req.user.role));
    }
    catch (error) {
        if (error.issues)
            return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateProject = updateProject;
const deleteProject = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can delete projects' });
        }
        const project = await Project_1.default.findById(req.params.id).select('_id name');
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        const recipientIds = await (0, notification_service_1.getProjectRelatedUserIds)(project._id);
        await Project_1.default.findByIdAndDelete(req.params.id);
        (0, socket_1.emitToAll)('project:updated', null); // Optionally notify clients to refresh project list
        await (0, notification_service_1.createAndDispatchNotifications)({
            recipientIds,
            actorUserId: req.user.userId,
            projectId: project._id,
            type: 'project_deleted',
            title: 'Project Deleted',
            message: `Project "${project.name}" was deleted.`,
            link: '/projects',
        });
        res.json({ message: 'Project deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteProject = deleteProject;
const addProjectMember = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId)
            return res.status(400).json({ message: 'userId is required' });
        const user = await User_1.default.findById(userId).select('githubUsername githubUserId githubConnectedAt email role firstName');
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const needsGithubSetup = ['manager', 'member'].includes(user.role || '');
        if (needsGithubSetup && (!user.githubUsername || !user.githubUserId || !user.githubConnectedAt)) {
            return res.status(400).json({ message: 'This team member must complete GitHub setup before being assigned to projects.' });
        }
        const project = await Project_1.default.findByIdAndUpdate(req.params.id, { $addToSet: { members: userId } }, { new: true }).populate('members', 'firstName lastName email role githubUsername');
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        // Best-effort GitHub collaborator sync. Do not block assignment on GitHub errors.
        if (project.githubRepoOwner && project.githubRepoName) {
            const githubUsername = user.githubUsername?.trim();
            if (githubUsername) {
                const config = await GithubConfig_1.default.findOne();
                if (config?.personalAccessToken) {
                    const response = await fetch(`https://api.github.com/repos/${project.githubRepoOwner}/${project.githubRepoName}/collaborators/${encodeURIComponent(githubUsername)}`, {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bearer ${config.personalAccessToken}`,
                            Accept: 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ permission: 'push' })
                    });
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`Failed to add GitHub collaborator ${githubUsername} to ${project.githubRepoOwner}/${project.githubRepoName}:`, response.status, errorText);
                    }
                }
            }
            else {
                console.warn(`Skipped GitHub collaborator sync for user ${user._id}: missing githubUsername`);
            }
        }
        await notifyProjectAudience({
            project,
            actorUserId: req.user.userId,
            type: 'project_member_added',
            title: 'Project Member Added',
            message: `${user.firstName || user.email} was added to project "${project.name}".`,
            recipientIds: [userId],
        });
        res.json(project);
        (0, socket_1.emitToAll)('project:updated', project);
    }
    catch (error) {
        console.error('addProjectMember error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.addProjectMember = addProjectMember;
const fixProjectRepo = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can fix repository configuration' });
        }
        const project = await Project_1.default.findById(req.params.id).select('_id githubRepoOwner githubRepoName');
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        if (!project.githubRepoOwner || !project.githubRepoName) {
            return res.status(400).json({ message: 'Project has no linked GitHub repository' });
        }
        const config = await GithubConfig_1.default.findOne();
        if (!config?.personalAccessToken) {
            return res.status(400).json({ message: 'GitHub integration is not connected.' });
        }
        const result = await ensureDevBranch(config.personalAccessToken, project.githubRepoOwner, project.githubRepoName);
        res.json({
            message: result.created ? 'Repository fixed. dev branch created.' : 'Repository already valid. dev branch exists.',
            branch: result.branch,
            created: result.created,
            repo: `${project.githubRepoOwner}/${project.githubRepoName}`,
        });
    }
    catch (error) {
        res.status(500).json({ message: error?.message || 'Failed to fix repository' });
    }
};
exports.fixProjectRepo = fixProjectRepo;
const getProjectRepoStatus = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can view repository status' });
        }
        const project = await Project_1.default.findById(req.params.id).select('_id githubRepoOwner githubRepoName');
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        if (!project.githubRepoOwner || !project.githubRepoName) {
            return res.json({
                hasRepo: false,
                devBranchReady: false,
                message: 'No GitHub repository linked',
            });
        }
        const config = await GithubConfig_1.default.findOne();
        if (!config?.personalAccessToken) {
            return res.status(400).json({ message: 'GitHub integration is not connected.' });
        }
        const devSha = await getBranchSha(config.personalAccessToken, project.githubRepoOwner, project.githubRepoName, 'dev');
        return res.json({
            hasRepo: true,
            repo: `${project.githubRepoOwner}/${project.githubRepoName}`,
            devBranchReady: Boolean(devSha),
            message: devSha ? 'dev branch exists' : 'dev branch missing',
        });
    }
    catch (error) {
        return res.status(500).json({ message: error?.message || 'Failed to get repository status' });
    }
};
exports.getProjectRepoStatus = getProjectRepoStatus;
const getProjectDockployStatus = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can view Dockploy status' });
        }
        const project = await Project_1.default.findById(req.params.id).select('_id name dockployAppId dockployLastDeployStatus dockployLastDeployAt dockployLastDeployMessage');
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        if (!project.dockployAppId) {
            return res.json({
                connected: false,
                message: 'Project is not linked to a Dockploy app',
                lastDeployStatus: project.dockployLastDeployStatus || 'idle',
                lastDeployAt: project.dockployLastDeployAt || null,
                lastDeployMessage: project.dockployLastDeployMessage || null,
            });
        }
        const config = await DockployConfig_1.default.findOne();
        if (!config?.baseUrl || !config?.apiToken) {
            return res.status(400).json({ message: 'Dockploy integration is not configured globally' });
        }
        const template = config.appStatusPathTemplate || '/api/application/{appId}';
        const path = applyDockployPathTemplate(template, project.dockployAppId);
        const result = await requestDockploy({ baseUrl: config.baseUrl, apiToken: config.apiToken, appStatusPathTemplate: config.appStatusPathTemplate }, path, 'GET');
        return res.json({
            connected: result.ok,
            dockployAppId: project.dockployAppId,
            dockployResponse: result.data,
            message: result.ok ? 'Dockploy app reachable' : `Dockploy app check failed (${result.status})`,
            lastDeployStatus: project.dockployLastDeployStatus || 'idle',
            lastDeployAt: project.dockployLastDeployAt || null,
            lastDeployMessage: project.dockployLastDeployMessage || null,
        });
    }
    catch (error) {
        return res.status(500).json({ message: error?.message || 'Failed to fetch Dockploy status' });
    }
};
exports.getProjectDockployStatus = getProjectDockployStatus;
const triggerProjectDockployDeploy = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can trigger Dockploy deploys' });
        }
        const project = await Project_1.default.findById(req.params.id);
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        if (!project.dockployAppId) {
            return res.status(400).json({ message: 'Project is not linked to a Dockploy app' });
        }
        const config = await DockployConfig_1.default.findOne();
        if (!config?.baseUrl || !config?.apiToken) {
            return res.status(400).json({ message: 'Dockploy integration is not configured globally' });
        }
        const template = config.deployPathTemplate || '/api/application/{appId}/deploy';
        const path = applyDockployPathTemplate(template, project.dockployAppId);
        const result = await requestDockploy({ baseUrl: config.baseUrl, apiToken: config.apiToken, deployPathTemplate: config.deployPathTemplate }, path, 'POST', req.body || {});
        project.dockployLastDeployAt = new Date();
        project.dockployLastDeployStatus = result.ok ? 'success' : 'failed';
        project.dockployLastDeployMessage = result.ok
            ? 'Deploy triggered successfully'
            : `Deploy failed (${result.status})`;
        await project.save();
        if (!result.ok) {
            await notifyProjectAudience({
                project,
                actorUserId: req.user.userId,
                type: 'project_deploy_failed',
                title: 'Deploy Failed',
                message: `Deploy failed for project "${project.name}".`,
            });
            return res.status(400).json({
                message: `Failed to trigger deploy (${result.status})`,
                dockployResponse: result.data,
            });
        }
        await notifyProjectAudience({
            project,
            actorUserId: req.user.userId,
            type: 'project_deploy_triggered',
            title: 'Deploy Triggered',
            message: `Deploy was triggered for project "${project.name}".`,
        });
        return res.json({
            message: 'Deploy triggered successfully',
            dockployResponse: result.data,
            lastDeployAt: project.dockployLastDeployAt,
            lastDeployStatus: project.dockployLastDeployStatus,
        });
    }
    catch (error) {
        return res.status(500).json({ message: error?.message || 'Failed to trigger deploy' });
    }
};
exports.triggerProjectDockployDeploy = triggerProjectDockployDeploy;
const removeProjectMember = async (req, res) => {
    try {
        const project = await Project_1.default.findByIdAndUpdate(req.params.id, { $pull: { members: req.params.userId } }, { new: true }).populate('members', 'firstName lastName email role');
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        await notifyProjectAudience({
            project,
            actorUserId: req.user.userId,
            type: 'project_member_removed',
            title: 'Project Member Removed',
            message: `A member was removed from project "${project.name}".`,
            recipientIds: [req.params.userId],
        });
        res.json(project);
        (0, socket_1.emitToAll)('project:updated', project);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.removeProjectMember = removeProjectMember;
// --- Documents ---
const uploadProjectDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, fileData, mimeType, fileName } = req.body;
        if (!title || !fileData || !mimeType || !fileName) {
            return res.status(400).json({ message: 'Missing required document fields' });
        }
        const project = await Project_1.default.findById(id);
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        // Ensure user has access to project
        if (req.user.role === 'client' && project.clientId?.toString() !== req.user.clientId) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (req.user.role === 'manager' || req.user.role === 'member') {
            if (!project.members.includes(req.user.userId)) {
                return res.status(403).json({ message: 'Not authorized' });
            }
        }
        project.documents.push({
            title,
            description: description || '',
            fileData,
            mimeType,
            fileName,
            uploadedBy: req.user.userId,
            uploadedAt: new Date()
        });
        await project.save();
        await project.populate('documents.uploadedBy', 'firstName lastName email');
        await notifyProjectAudience({
            project,
            actorUserId: req.user.userId,
            type: 'project_document_uploaded',
            title: 'Project Document Uploaded',
            message: `A document "${title}" was uploaded in "${project.name}".`,
        });
        res.status(201).json(project.documents[project.documents.length - 1]);
    }
    catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.uploadProjectDocument = uploadProjectDocument;
const deleteProjectDocument = async (req, res) => {
    try {
        const { id, docId } = req.params;
        const project = await Project_1.default.findById(id);
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        const docIndex = project.documents.findIndex(d => d._id?.toString() === docId);
        if (docIndex === -1)
            return res.status(404).json({ message: 'Document not found' });
        const doc = project.documents[docIndex];
        // Access control for deletion: Admin can delete any. Others can only delete their own.
        if (req.user.role !== 'admin' && doc.uploadedBy.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'You can only delete your own documents' });
        }
        project.documents.splice(docIndex, 1);
        await project.save();
        await notifyProjectAudience({
            project,
            actorUserId: req.user.userId,
            type: 'project_document_deleted',
            title: 'Project Document Deleted',
            message: `A project document was deleted in "${project.name}".`,
        });
        res.json({ message: 'Document deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteProjectDocument = deleteProjectDocument;
const downloadProjectDocument = async (req, res) => {
    try {
        const { id, docId } = req.params;
        const project = await Project_1.default.findById(id);
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        if (!ensureProjectAccess(project, req.user)) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const doc = project.documents.find((d) => d._id?.toString() === docId);
        if (!doc)
            return res.status(404).json({ message: 'Document not found' });
        res.json({
            _id: doc._id,
            title: doc.title,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            fileData: doc.fileData,
        });
    }
    catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.downloadProjectDocument = downloadProjectDocument;
