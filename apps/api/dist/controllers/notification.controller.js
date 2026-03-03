"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsRead = exports.markNotificationRead = exports.getMyUnreadNotificationCount = exports.getMyNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const getMyNotifications = async (req, res) => {
    try {
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));
        const before = req.query.before ? new Date(String(req.query.before)) : null;
        const query = { recipientId: req.user.userId };
        if (before && !Number.isNaN(before.getTime())) {
            query.createdAt = { $lt: before };
        }
        const notifications = await Notification_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        const unreadCount = await Notification_1.default.countDocuments({
            recipientId: req.user.userId,
            readAt: null,
        });
        res.json({ items: notifications, unreadCount });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMyNotifications = getMyNotifications;
const getMyUnreadNotificationCount = async (req, res) => {
    try {
        const unreadCount = await Notification_1.default.countDocuments({
            recipientId: req.user.userId,
            readAt: null,
        });
        res.json({ unreadCount });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMyUnreadNotificationCount = getMyUnreadNotificationCount;
const markNotificationRead = async (req, res) => {
    try {
        const notification = await Notification_1.default.findOneAndUpdate({ _id: req.params.id, recipientId: req.user.userId }, { $set: { readAt: new Date() } }, { new: true }).lean();
        if (!notification)
            return res.status(404).json({ message: 'Notification not found' });
        res.json(notification);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (req, res) => {
    try {
        const now = new Date();
        await Notification_1.default.updateMany({ recipientId: req.user.userId, readAt: null }, { $set: { readAt: now } });
        res.json({ success: true, readAt: now.toISOString() });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.markAllNotificationsRead = markAllNotificationsRead;
