import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Project from '../models/Project';
import { ProjectSchema } from '@devmanager/shared/dist/project.schema';

export const getProjects = async (req: AuthRequest, res: Response) => {
    try {
        const query: any = { organizationId: req.user!.organizationId };

        // If user is a client, only show their projects
        if (req.user!.role === 'client' && req.user!.clientId) {
            query.clientId = req.user!.clientId;
        }

        const projects = await Project.find(query).populate('clientId', 'name');
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createProject = async (req: AuthRequest, res: Response) => {
    try {
        const validated = ProjectSchema.parse(req.body);
        const project = await Project.create({
            ...validated,
            organizationId: req.user!.organizationId,
        });
        res.status(201).json(project);
    } catch (error: any) {
        if (error.issues) return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};

export const getProject = async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            organizationId: req.user!.organizationId
        }).populate('clientId', 'name');

        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
