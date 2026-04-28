import { Response } from 'express';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Project from '../models/Project';

export const getAssistants = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'client') {
            return res.status(403).json({ message: 'Access denied. Only clients can manage assistants.' });
        }

        const assistants = await User.find({
            role: 'client_assistant',
            clientId: req.user.clientId
        }).select('-passwordHash');

        res.json(assistants);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createAssistant = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'client') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { firstName, lastName, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password || 'password123', salt);

        const assistant = await User.create({
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
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const deleteAssistant = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'client') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const assistantId = req.params.id;
        const assistant = await User.findOne({ _id: assistantId, role: 'client_assistant', clientId: req.user.clientId });

        if (!assistant) {
            return res.status(404).json({ message: 'Assistant not found' });
        }

        await User.findByIdAndDelete(assistantId);

        // Optional: Remove assistant from all projects
        await Project.updateMany(
            { members: assistantId },
            { $pull: { members: assistantId } }
        );

        res.json({ message: 'Assistant deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const assignAssistantToProject = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'client') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const assistantId = req.params.id;
        const { projectId } = req.body;

        const assistant = await User.findOne({ _id: assistantId, role: 'client_assistant', clientId: req.user.clientId });
        if (!assistant) {
            return res.status(404).json({ message: 'Assistant not found' });
        }

        const project = await Project.findOne({ _id: projectId, clientId: req.user.clientId });
        if (!project) {
            return res.status(404).json({ message: 'Project not found or not owned by you' });
        }

        if (!project.members.includes(assistant._id as any)) {
            project.members.push(assistant._id as any);
            await project.save();
        }

        res.json({ message: 'Assistant assigned to project successfully', project });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const unassignAssistantFromProject = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'client') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const assistantId = req.params.id;
        const projectId = req.params.projectId;

        const assistant = await User.findOne({ _id: assistantId, role: 'client_assistant', clientId: req.user.clientId });
        if (!assistant) {
            return res.status(404).json({ message: 'Assistant not found' });
        }

        const project = await Project.findOne({ _id: projectId, clientId: req.user.clientId });
        if (!project) {
            return res.status(404).json({ message: 'Project not found or not owned by you' });
        }

        project.members = project.members.filter(m => m.toString() !== assistant._id.toString());
        await project.save();

        res.json({ message: 'Assistant removed from project successfully', project });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
