"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepositories = exports.syncIssues = exports.handleGithubCallback = exports.getGithubAuthUrl = exports.disconnectGithub = exports.saveGithubConfig = exports.getGithubConfig = void 0;
const GithubConfig_1 = __importDefault(require("../models/GithubConfig"));
const github_schema_1 = require("@devmanager/shared/dist/github.schema");
const getGithubConfig = async (_req, res) => {
    try {
        const config = await GithubConfig_1.default.findOne();
        res.json(config);
    }
    catch (error) {
        console.error('getGithubConfig error:', error);
        res.json(null);
    }
};
exports.getGithubConfig = getGithubConfig;
const saveGithubConfig = async (req, res) => {
    try {
        const validated = github_schema_1.GithubConfigSchema.parse(req.body);
        const config = await GithubConfig_1.default.findOneAndUpdate({}, { ...validated }, { new: true, upsert: true });
        res.json(config);
    }
    catch (error) {
        res.status(400).json({ errors: error.issues || error.message });
    }
};
exports.saveGithubConfig = saveGithubConfig;
const disconnectGithub = async (_req, res) => {
    try {
        await GithubConfig_1.default.deleteOne({});
        res.json({ message: 'GitHub disconnected successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.disconnectGithub = disconnectGithub;
const getGithubAuthUrl = async (_req, res) => {
    try {
        const clientId = process.env.GITHUB_CLIENT_ID;
        if (!clientId) {
            return res.status(500).json({ message: 'GITHUB_CLIENT_ID not configured on server. Please add it to your .env file.' });
        }
        const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        const redirectUri = `${frontendBaseUrl}/github-settings`;
        const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&redirect_uri=${encodeURIComponent(redirectUri)}`;
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
        const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        const redirectUri = `${frontendBaseUrl}/github-settings`;
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
        });
        const data = await response.json();
        if (data.error) {
            console.error('handleGithubCallback error from GitHub API:', data.error, data.error_description);
            return res.status(400).json({ message: data.error_description || data.error });
        }
        const accessToken = data.access_token;
        if (!accessToken) {
            return res.status(400).json({ message: 'Failed to get access token from GitHub' });
        }
        const config = await GithubConfig_1.default.findOneAndUpdate({}, { personalAccessToken: accessToken }, { new: true, upsert: true });
        res.json({ message: 'Connected to GitHub successfully', config });
    }
    catch (error) {
        console.error('handleGithubCallback uncaught server error:', error.message, error.stack);
        res.status(500).json({ message: 'Server error during GitHub authentication', error: error.message });
    }
};
exports.handleGithubCallback = handleGithubCallback;
const syncIssues = async (_req, res) => {
    try {
        const config = await GithubConfig_1.default.findOne();
        if (!config) {
            return res.status(400).json({ message: 'GitHub not configured' });
        }
        res.json({ message: 'Sync started successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.syncIssues = syncIssues;
const getRepositories = async (_req, res) => {
    try {
        const config = await GithubConfig_1.default.findOne();
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
            const errData = await response.json();
            return res.status(response.status).json({ message: errData.message || 'Failed to fetch repositories from GitHub' });
        }
        const repoData = await response.json();
        const repos = repoData.map((repo) => ({
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
