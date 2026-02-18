import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Attendance from '../models/Attendance';

export const getAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { date } = req.query;
        const query: any = { organizationId: req.user!.organizationId, userId: req.user!.userId };

        if (date) {
            const start = new Date(date as string);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date as string);
            end.setHours(23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }

        const attendance = await Attendance.find(query).sort({ date: -1 });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const checkIn = async (req: AuthRequest, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existing = await Attendance.findOne({
            userId: req.user!.userId,
            date: today,
        });

        if (existing) {
            return res.status(400).json({ message: 'Already checked in today' });
        }

        const attendance = await Attendance.create({
            organizationId: req.user!.organizationId,
            userId: req.user!.userId,
            date: today,
            checkInTime: new Date(),
            status: 'present',
        });

        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const checkOut = async (req: AuthRequest, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            userId: req.user!.userId,
            date: today,
        });

        if (!attendance) {
            return res.status(404).json({ message: 'No check-in found for today' });
        }

        if (attendance.checkOutTime) {
            return res.status(400).json({ message: 'Already checked out' });
        }

        attendance.checkOutTime = new Date();
        // Calculate duration in minutes
        if (attendance.checkInTime) {
            const diff = attendance.checkOutTime.getTime() - attendance.checkInTime.getTime();
            attendance.duration = Math.round(diff / 60000);
        }
        await attendance.save();

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
