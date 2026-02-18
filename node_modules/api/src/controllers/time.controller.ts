import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import TimeEntry from '../models/TimeEntry';
import { TimeEntrySchema } from '@devmanager/shared/dist/time.schema';

export const getTimeEntries = async (req: AuthRequest, res: Response) => {
    try {
        const entries = await TimeEntry.find({
            organizationId: req.user!.organizationId,
            userId: req.user!.userId
        }).sort({ startTime: -1 });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createTimeEntry = async (req: AuthRequest, res: Response) => {
    try {
        const validated = TimeEntrySchema.parse(req.body);
        const entry = await TimeEntry.create({
            ...validated,
            organizationId: req.user!.organizationId,
            userId: req.user!.userId,
        });
        res.status(201).json(entry);
    } catch (error: any) {
        res.status(400).json({ errors: error.issues || error.message });
    }
};

export const startTimer = async (req: AuthRequest, res: Response) => {
    try {
        // Check if running timer exists
        const running = await TimeEntry.findOne({
            userId: req.user!.userId,
            endTime: null,
        });

        if (running) {
            return res.status(400).json({ message: 'Timer already running' });
        }

        const { taskId, projectId, description } = req.body;
        const entry = await TimeEntry.create({
            organizationId: req.user!.organizationId,
            userId: req.user!.userId,
            taskId,
            projectId,
            description,
            startTime: new Date(),
        });

        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const stopTimer = async (req: AuthRequest, res: Response) => {
    try {
        const entry = await TimeEntry.findOne({
            userId: req.user!.userId,
            endTime: null,
        });

        if (!entry) {
            return res.status(404).json({ message: 'No running timer' });
        }

        const endTime = new Date();
        const duration = Math.round((endTime.getTime() - entry.startTime.getTime()) / 1000 / 60); // minutes

        entry.endTime = endTime;
        entry.duration = duration;
        await entry.save();

        res.json(entry);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
