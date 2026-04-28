"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unassignAssistantFromProject = exports.assignAssistantToProject = exports.deleteAssistant = exports.createAssistant = exports.getAssistants = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = __importDefault(require("../models/User"));
const Project_1 = __importDefault(require("../models/Project"));
const getAssistants = async (req, res) => {
    try {
        if (req.user?.role !== 'client') {
            return res.status(403).json({ message: 'Access denied. Only clients can manage assistants.' });
        }
        const assistants = await User_1.default.find({
            role: 'client_assistant',
            clientId: req.user.clientId
        }).select('-passwordHash');
        res.json(assistants);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAssistants = getAssistants;
const createAssistant = async (req, res) => {
    try {
        if (req.user?.role !== 'client') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const { firstName, lastName, email, password } = req.body;
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(password || 'password123', salt);
        const assistant = await User_1.default.create({
            email,
            passwordHash,
            firstName,
            lastName,
            role: 'client_assistant',
            clientId: req.user.clientId,
            isActive: true
        });
        // Omit passwordHash from response
        const { passwordHash: _, ...assistantData } = assistant.toObject();
        res.status(201).json(assistantData);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.createAssistant = createAssistant;
const deleteAssistant = async (req, res) => {
    try {
        if (req.user?.role !== 'client') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const assistantId = req.params.id;
        const assistant = await User_1.default.findOne({ _id: assistantId, role: 'client_assistant', clientId: req.user.clientId });
        if (!assistant) {
            return res.status(404).json({ message: 'Assistant not found' });
        }
        await User_1.default.findByIdAndDelete(assistantId);
        // Optional: Remove assistant from all projects
        await Project_1.default.updateMany({ members: assistantId }, { $pull: { members: assistantId } });
        res.json({ message: 'Assistant deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.deleteAssistant = deleteAssistant;
const assignAssistantToProject = async (req, res) => {
    try {
        if (req.user?.role !== 'client') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const assistantId = req.params.id;
        const { projectId } = req.body;
        const assistant = await User_1.default.findOne({ _id: assistantId, role: 'client_assistant', clientId: req.user.clientId });
        if (!assistant) {
            return res.status(404).json({ message: 'Assistant not found' });
        }
        const project = await Project_1.default.findOne({ _id: projectId, clientId: req.user.clientId });
        if (!project) {
            return res.status(404).json({ message: 'Project not found or not owned by you' });
        }
        if (!project.members.includes(assistant._id)) {
            project.members.push(assistant._id);
            await project.save();
        }
        res.json({ message: 'Assistant assigned to project successfully', project });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.assignAssistantToProject = assignAssistantToProject;
const unassignAssistantFromProject = async (req, res) => {
    try {
        if (req.user?.role !== 'client') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const assistantId = req.params.id;
        const projectId = req.params.projectId;
        const assistant = await User_1.default.findOne({ _id: assistantId, role: 'client_assistant', clientId: req.user.clientId });
        if (!assistant) {
            return res.status(404).json({ message: 'Assistant not found' });
        }
        const project = await Project_1.default.findOne({ _id: projectId, clientId: req.user.clientId });
        if (!project) {
            return res.status(404).json({ message: 'Project not found or not owned by you' });
        }
        project.members = project.members.filter(m => m.toString() !== assistant._id.toString());
        await project.save();
        res.json({ message: 'Assistant removed from project successfully', project });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.unassignAssistantFromProject = unassignAssistantFromProject;
