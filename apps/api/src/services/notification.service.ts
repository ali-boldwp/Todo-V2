import Notification from '../models/Notification';
import Project from '../models/Project';
import User from '../models/User';
import { emitToUser } from '../socket';

type ObjectIdLike = string | { toString?: () => string } | null | undefined;

const toIdString = (value: ObjectIdLike): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value?.toString === 'function') return value.toString();
    return null;
};

const uniqIds = (values: Array<ObjectIdLike>) => {
    const set = new Set<string>();
    for (const value of values) {
        const id = toIdString(value);
        if (id) set.add(id);
    }
    return Array.from(set);
};

export const getProjectRelatedUserIds = async (
    projectId: ObjectIdLike,
    opts?: { includeAdmins?: boolean }
): Promise<string[]> => {
    const id = toIdString(projectId);
    if (!id) return [];

    const project = await Project.findById(id).select('members clientId').lean();
    if (!project) return [];

    const memberIds = Array.isArray(project.members) ? project.members.map((m: any) => m?.toString?.() || String(m)) : [];
    const clientUsers = project.clientId
        ? await User.find({ role: 'client', clientId: project.clientId, isActive: true }).select('_id').lean()
        : [];
    const adminUsers = opts?.includeAdmins === false
        ? []
        : await User.find({ role: 'admin', isActive: true }).select('_id').lean();

    return uniqIds([
        ...memberIds,
        ...clientUsers.map((u: any) => u?._id),
        ...adminUsers.map((u: any) => u?._id),
    ]);
};

export const createAndDispatchNotifications = async (input: {
    recipientIds: Array<ObjectIdLike>;
    actorUserId?: ObjectIdLike;
    projectId?: ObjectIdLike;
    taskId?: ObjectIdLike;
    type: string;
    title: string;
    message: string;
    link?: string;
    metadata?: any;
}) => {
    const recipients = uniqIds(input.recipientIds);
    const actorUserId = toIdString(input.actorUserId);
    const filteredRecipients = actorUserId ? recipients.filter((id) => id !== actorUserId) : recipients;
    if (!filteredRecipients.length) return [];

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

    const created = await Notification.insertMany(docs, { ordered: false });
    for (const notification of created) {
        const payload = typeof notification.toObject === 'function' ? notification.toObject() : notification;
        const recipientId = payload?.recipientId?.toString?.() || payload?.recipientId;
        if (recipientId) {
            emitToUser(String(recipientId), 'notification:created', payload);
        }
    }

    return created;
};
