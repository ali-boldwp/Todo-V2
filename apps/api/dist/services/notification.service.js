"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndDispatchNotifications = exports.getProjectRelatedUserIds = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const Project_1 = __importDefault(require("../models/Project"));
const User_1 = __importDefault(require("../models/User"));
const socket_1 = require("../socket");
const toIdString = (value) => {
    if (!value)
        return null;
    if (typeof value === 'string')
        return value;
    if (typeof value?.toString === 'function')
        return value.toString();
    return null;
};
const uniqIds = (values) => {
    const set = new Set();
    for (const value of values) {
        const id = toIdString(value);
        if (id)
            set.add(id);
    }
    return Array.from(set);
};
const getProjectRelatedUserIds = async (projectId, opts) => {
    const id = toIdString(projectId);
    if (!id)
        return [];
    const project = await Project_1.default.findById(id).select('members clientId').lean();
    if (!project)
        return [];
    const memberIds = Array.isArray(project.members) ? project.members.map((m) => m?.toString?.() || String(m)) : [];
    const clientUsers = project.clientId
        ? await User_1.default.find({ role: 'client', clientId: project.clientId, isActive: true }).select('_id').lean()
        : [];
    const adminUsers = opts?.includeAdmins === false
        ? []
        : await User_1.default.find({ role: 'admin', isActive: true }).select('_id').lean();
    return uniqIds([
        ...memberIds,
        ...clientUsers.map((u) => u?._id),
        ...adminUsers.map((u) => u?._id),
    ]);
};
exports.getProjectRelatedUserIds = getProjectRelatedUserIds;
const createAndDispatchNotifications = async (input) => {
    const recipients = uniqIds(input.recipientIds);
    const actorUserId = toIdString(input.actorUserId);
    const filteredRecipients = actorUserId ? recipients.filter((id) => id !== actorUserId) : recipients;
    if (!filteredRecipients.length)
        return [];
    const docs = filteredRecipients.map((recipientId) => ({
        recipientId,
        actorUserId: actorUserId || undefined,
        projectId: toIdString(input.projectId) || undefined,
        taskId: toIdString(input.taskId) || undefined,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        metadata: input.metadata,
        readAt: null,
    }));
    const created = await Notification_1.default.insertMany(docs, { ordered: false });
    for (const notification of created) {
        const payload = typeof notification.toObject === 'function' ? notification.toObject() : notification;
        const recipientId = payload?.recipientId?.toString?.() || payload?.recipientId;
        if (recipientId) {
            (0, socket_1.emitToUser)(String(recipientId), 'notification:created', payload);
        }
    }
    return created;
};
exports.createAndDispatchNotifications = createAndDispatchNotifications;
