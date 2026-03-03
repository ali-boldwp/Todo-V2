import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));
        const before = req.query.before ? new Date(String(req.query.before)) : null;
        const query: any = { recipientId: req.user!.userId };
        if (before && !Number.isNaN(before.getTime())) {
            query.createdAt = { $lt: before };
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const unreadCount = await Notification.countDocuments({
            recipientId: req.user!.userId,
            readAt: null,
        });

        res.json({ items: notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMyUnreadNotificationCount = async (req: AuthRequest, res: Response) => {
    try {
        const unreadCount = await Notification.countDocuments({
            recipientId: req.user!.userId,
            readAt: null,
        });
        res.json({ unreadCount });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipientId: req.user!.userId },
            { $set: { readAt: new Date() } },
            { new: true }
        ).lean();

        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
    try {
        const now = new Date();
        await Notification.updateMany(
            { recipientId: req.user!.userId, readAt: null },
            { $set: { readAt: now } }
        );
        res.json({ success: true, readAt: now.toISOString() });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
