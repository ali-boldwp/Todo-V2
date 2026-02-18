import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Task from '../models/Task';
import { TaskSchema } from '@devmanager/shared/dist/task.schema';

export const getTasks = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.query;
        const query: any = { organizationId: req.user!.organizationId };
        if (projectId) query.projectId = projectId;

        const tasks = await Task.find(query).populate('assigneeId', 'firstName lastName email');
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createTask = async (req: AuthRequest, res: Response) => {
    try {
        const validated = TaskSchema.parse(req.body);
        const task = await Task.create({
            ...validated,
            organizationId: req.user!.organizationId,
        });
        res.status(201).json(task);
    } catch (error: any) {
        if (error.issues) return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
    try {
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.user!.organizationId },
            req.body,
            { new: true }
        );
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
