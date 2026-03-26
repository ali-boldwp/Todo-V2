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
const ai_service_1 = require("../services/ai.service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
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
        const projects = await Project.find(projectQuery).select('_id name');
        const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
        const teamMembers = await User.find({
            teamId: req.user.teamId,
            isActive: true
        }).select('_id firstName lastName');
        const result = await (0, ai_service_1.chatWithAI)(messages, taskDraft || {}, projectId, projects, teamMembers);
        res.json(result);
    }
    catch (error) {
        console.error('AI chat route error:', error.message);
        res.status(500).json({ error: 'AI service error', message: error.message });
    }
});
exports.default = router;
