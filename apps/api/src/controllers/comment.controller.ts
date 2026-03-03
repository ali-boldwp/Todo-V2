import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Comment from '../models/Comment';
import Task from '../models/Task';
import { emitToProject } from '../socket';
import { createAndDispatchNotifications, getProjectRelatedUserIds } from '../services/notification.service';

export const getComments = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.params;
        const requestedType = req.query.type === 'clarification' ? 'clarification' : 'general';
        const query: any = { taskId };
        if (requestedType === 'clarification') {
            query.type = 'clarification';
        } else {
            query.$or = [{ type: 'general' }, { type: { $exists: false } }];
        }
        const comments = await Comment.find(query).populate('userId', 'firstName lastName email role');

        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createComment = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.params;
        const { content } = req.body;
        const commentType = req.body.type === 'clarification' ? 'clarification' : 'general';

        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }

        const comment = await Comment.create({
            taskId,
            userId: req.user!.userId,
            content,
            type: commentType,
        });

        const task = await Task.findById(taskId);
        if (task && commentType === 'clarification') {
            const internalRoles = ['admin', 'manager', 'member'];
            if (internalRoles.includes(req.user!.role)) {
                // Internal team message opens/keeps clarification state.
                task.status = 'clarification' as any;
                task.needsClarification = true;
            } else if (req.user!.role === 'client' && task.status === 'clarification') {
                // Client response marks the clarification as addressed.
                task.status = 'clarified' as any;
                task.needsClarification = false;
            }
            await task.save();
            if (task.projectId) {
                emitToProject(task.projectId.toString(), 'task:updated', {
                    _id: task._id,
                    projectId: task.projectId,
                });
            }
        }

        const populated = await comment.populate('userId', 'firstName lastName email role');
        if (task?.projectId) {
            const recipientIds = await getProjectRelatedUserIds(task.projectId);
            await createAndDispatchNotifications({
                recipientIds,
                actorUserId: req.user!.userId,
                projectId: task.projectId,
                taskId: task._id,
                type: commentType === 'clarification' ? 'task_clarification_comment' : 'task_comment_added',
                title: commentType === 'clarification' ? 'Clarification Comment Added' : 'Task Comment Added',
                message: `New ${commentType} comment on "${task.title}".`,
                link: `/projects/${task.projectId.toString()}/tasks?taskId=${task._id.toString()}`,
            });
        }
        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
