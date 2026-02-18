"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncIssues = exports.saveGithubConfig = exports.getGithubConfig = void 0;
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
