"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepositories = exports.syncIssues = exports.handleGithubCallback = exports.getGithubAuthUrl = exports.saveGithubConfig = exports.getGithubConfig = void 0;
const GithubConfig_1 = __importDefault(require("../models/GithubConfig"));
const github_schema_1 = require("@devmanager/shared/dist/github.schema");
const getGithubConfig = async (req, res) => {
    try {
        const config = await GithubConfig_1.default.findOne({ organizationId: req.user.organizationId });
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getGithubConfig = getGithubConfig;
const saveGithubConfig = async (req, res) => {
    try {
        const validated = github_schema_1.GithubConfigSchema.parse(req.body);
        const config = await GithubConfig_1.default.findOneAndUpdate({ organizationId: req.user.organizationId }, { ...validated, organizationId: req.user.organizationId }, { new: true, upsert: true });
        res.json(config);
    }
    catch (error) {
        res.status(400).json({ errors: error.issues || error.message });
    }
};
exports.saveGithubConfig = saveGithubConfig;
const getGithubAuthUrl = async (_req, res) => {
    try {
        const clientId = process.env.GITHUB_CLIENT_ID;
        if (!clientId) {
            return res.status(500).json({ message: 'GITHUB_CLIENT_ID not configured on server. Please add it to your .env file.' });
        }
        const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`;
        res.json({ url });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getGithubAuthUrl = getGithubAuthUrl;
const handleGithubCallback = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: 'Authorization code is required' });
        }
        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return res.status(500).json({ message: 'GitHub OAuth credentials not configured on server' });
        }
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
            }),
        });
        const data = await response.json();
        if (data.error) {
            return res.status(400).json({ message: data.error_description || data.error });
        }
        const accessToken = data.access_token;
        if (!accessToken) {
            return res.status(400).json({ message: 'Failed to get access token from GitHub' });
        }
        // Save it to the config
        const config = await GithubConfig_1.default.findOneAndUpdate({ organizationId: req.user.organizationId }, { personalAccessToken: accessToken, organizationId: req.user.organizationId }, { new: true, upsert: true });
        res.json({ message: 'Connected to GitHub successfully', config });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error during GitHub authentication' });
    }
};
exports.handleGithubCallback = handleGithubCallback;
const syncIssues = async (req, res) => {
    try {
        const config = await GithubConfig_1.default.findOne({ organizationId: req.user.organizationId });
        if (!config) {
            return res.status(400).json({ message: 'GitHub not configured' });
        }
        // Placeholder for actual GitHub API call
        // const response = await axios.get(`https://api.github.com/repos/${config.repoOwner}/${config.repoName}/issues`, {
        //   headers: { Authorization: `token ${config.personalAccessToken}` }
        // });
        // Logic to convert issues to Tasks would go here
        res.json({ message: 'Sync started successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.syncIssues = syncIssues;
const getRepositories = async (req, res) => {
    try {
        const config = await GithubConfig_1.default.findOne({ organizationId: req.user.organizationId });
        if (!config || !config.personalAccessToken) {
            return res.status(400).json({ message: 'GitHub is not connected' });
        }
        const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
            headers: {
                Authorization: `Bearer ${config.personalAccessToken}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
        if (!response.ok) {
            const data = await response.json();
            return res.status(response.status).json({ message: data.message || 'Failed to fetch repositories from GitHub' });
        }
        const data = await response.json();
        const repos = data.map((repo) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            private: repo.private,
            url: repo.html_url
        }));
        res.json(repos);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error while fetching repositories' });
    }
};
exports.getRepositories = getRepositories;
