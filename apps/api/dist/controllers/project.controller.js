"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProject = exports.getProject = exports.createProject = exports.getProjects = void 0;
const Project_1 = __importDefault(require("../models/Project"));
const GithubConfig_1 = __importDefault(require("../models/GithubConfig"));
const project_schema_1 = require("@devmanager/shared/dist/project.schema");
const getProjects = async (req, res) => {
    try {
        const query = { organizationId: req.user.organizationId };
        // If user is not admin, apply visibility filters
        if (req.user.role !== 'admin') {
            if (req.user.role === 'client' && req.user.clientId) {
                query.clientId = req.user.clientId;
            }
            else {
                // For regular users, show public projects OR those they are members of
                query.$or = [
                    { visibility: 'public' },
                    { members: req.user.userId }
                ];
            }
        }
        const projects = await Project_1.default.find(query).populate('clientId', 'name');
        res.json(projects);
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
            const config = await GithubConfig_1.default.findOne({ organizationId: req.user.organizationId });
            if (config && config.personalAccessToken) {
                // Ensure name is a valid repo name (no spaces/weird chars)
                const safeName = validated.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
                const response = await fetch('https://api.github.com/user/repos', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${config.personalAccessToken}`,
                        Accept: 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: safeName,
                        private: true
                    })
                });
                if (response.ok) {
                    const repoData = await response.json();
                    githubRepoOwner = repoData.owner.login;
                    githubRepoName = repoData.name;
                }
            }
        }
        const project = await Project_1.default.create({
            ...validated,
            clientId,
            githubRepoOwner,
            githubRepoName,
            organizationId: req.user.organizationId,
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
        const query = {
            _id: req.params.id,
            organizationId: req.user.organizationId
        };
        // If not admin, check visibility/membership
        if (req.user.role !== 'admin') {
            if (req.user.role === 'client') {
                query.clientId = req.user.clientId;
            }
            else {
                query.$or = [
                    { visibility: 'public' },
                    { members: req.user.userId }
                ];
            }
        }
        const project = await Project_1.default.findOne(query).populate('clientId', 'name');
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getProject = getProject;
const updateProject = async (req, res) => {
    try {
        const validated = project_schema_1.ProjectSchema.partial().parse(req.body);
        let githubRepoOwner = validated.githubRepoOwner;
        let githubRepoName = validated.githubRepoName;
        if (validated.createGithubRepo && validated.name) {
            const config = await GithubConfig_1.default.findOne({ organizationId: req.user.organizationId });
            if (config && config.personalAccessToken) {
                const safeName = validated.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
                const response = await fetch('https://api.github.com/user/repos', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${config.personalAccessToken}`,
                        Accept: 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: safeName,
                        private: true
                    })
                });
                if (response.ok) {
                    const repoData = await response.json();
                    githubRepoOwner = repoData.owner.login;
                    githubRepoName = repoData.name;
                }
            }
        }
        const updateData = { ...validated };
        if (githubRepoOwner)
            updateData.githubRepoOwner = githubRepoOwner;
        if (githubRepoName)
            updateData.githubRepoName = githubRepoName;
        const project = await Project_1.default.findOneAndUpdate({ _id: req.params.id, organizationId: req.user.organizationId }, updateData, { new: true });
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    }
    catch (error) {
        if (error.issues)
            return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateProject = updateProject;
