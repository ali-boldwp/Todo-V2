import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Epic from '../models/Epic';
import Sprint from '../models/Sprint';
import { EpicSchema, SprintSchema } from '@devmanager/shared/dist/planning.schema';

export const getEpics = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.query;
        const query: any = {};
        if (projectId) query.projectId = projectId;
        const epics = await Epic.find(query);
        res.json(epics);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createEpic = async (req: AuthRequest, res: Response) => {
    try {
        const validated = EpicSchema.parse(req.body);
        const epic = await Epic.create({ ...validated });
        res.status(201).json(epic);
    } catch (error: any) {
        res.status(400).json({ errors: error.issues || error.message });
    }
};

export const getSprints = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.query;
        const query: any = {};
        if (projectId) query.projectId = projectId;
        const sprints = await Sprint.find(query).sort({ startDate: 1 });
        res.json(sprints);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createSprint = async (req: AuthRequest, res: Response) => {
    try {
        const validated = SprintSchema.parse(req.body);
        const sprint = await Sprint.create({ ...validated });
        res.status(201).json(sprint);
    } catch (error: any) {
        res.status(400).json({ errors: error.issues || error.message });
    }
};
