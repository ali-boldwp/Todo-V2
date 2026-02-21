import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Project from '../models/Project';
import { ProjectSchema } from '@devmanager/shared/dist/project.schema';

export const getProjects = async (req: AuthRequest, res: Response) => {
    try {
        const query: any = { organizationId: req.user!.organizationId };

        // If user is not admin, apply visibility filters
        if (req.user!.role !== 'admin') {
            if (req.user!.role === 'client' && req.user!.clientId) {
                query.clientId = req.user!.clientId;
            } else {
                // For regular users, show public projects OR those they are members of
                query.$or = [
                    { visibility: 'public' },
                    { members: req.user!._id }
                ];
            }
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

        let clientId = validated.clientId;
        if (req.user!.role === 'client') {
            clientId = req.user!.clientId?.toString();
        }

        const project = await Project.create({
            ...validated,
            clientId,
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
        const query: any = {
            _id: req.params.id,
            organizationId: req.user!.organizationId
        };

        // If not admin, check visibility/membership
        if (req.user!.role !== 'admin') {
            if (req.user!.role === 'client') {
                query.clientId = req.user!.clientId;
            } else {
                query.$or = [
                    { visibility: 'public' },
                    { members: req.user!._id }
                ];
            }
        }

        const project = await Project.findOne(query).populate('clientId', 'name');

        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
    try {
        const validated = ProjectSchema.partial().parse(req.body);

        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.user!.organizationId },
            validated,
            { new: true }
        );

        if (!project) return res.status(404).json({ message: 'Project not found' });

        res.json(project);
    } catch (error: any) {
        if (error.issues) return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};
