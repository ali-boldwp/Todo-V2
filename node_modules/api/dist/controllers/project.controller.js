"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadProjectDocument = exports.deleteProjectDocument = exports.uploadProjectDocument = exports.removeProjectMember = exports.addProjectMember = exports.deleteProject = exports.updateProject = exports.getProject = exports.createProject = exports.getProjects = void 0;
const Project_1 = __importDefault(require("../models/Project"));
const GithubConfig_1 = __importDefault(require("../models/GithubConfig"));
const User_1 = __importDefault(require("../models/User"));
const project_schema_1 = require("@devmanager/shared/dist/project.schema");
const socket_1 = require("../socket");
const ACCESS_FIELD_KEYS = ['devWebsiteUrl', 'accessAccounts'];
const hasProjectAccessFieldInPayload = (payload) => ACCESS_FIELD_KEYS.some((key) => Object.prototype.hasOwnProperty.call(payload || {}, key));
const sanitizeProjectForViewer = (project, role) => {
    const obj = typeof project?.toObject === 'function' ? project.toObject() : project;
    if (role === 'admin')
        return obj;
    const { devWebsiteUrl, accessAccounts, ...rest } = obj || {};
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
        const project = await Project_1.default.create({
            ...validated,
            clientId,
            githubRepoOwner,
            githubRepoName,
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
        if (req.user.role !== 'admin' && hasProjectAccessFieldInPayload(req.body || {})) {
            return res.status(403).json({ message: 'Only admin can update project access credentials' });
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
        const project = await Project_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
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
        const project = await Project_1.default.findByIdAndDelete(req.params.id);
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        (0, socket_1.emitToAll)('project:updated', null); // Optionally notify clients to refresh project list
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
        const user = await User_1.default.findById(userId).select('githubUsername githubUserId githubConnectedAt email role');
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
        res.json(project);
        (0, socket_1.emitToAll)('project:updated', project);
    }
    catch (error) {
        console.error('addProjectMember error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.addProjectMember = addProjectMember;
const removeProjectMember = async (req, res) => {
    try {
        const project = await Project_1.default.findByIdAndUpdate(req.params.id, { $pull: { members: req.params.userId } }, { new: true }).populate('members', 'firstName lastName email role');
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
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
