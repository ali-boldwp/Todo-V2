import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Comment from '../models/Comment';
import { CommentSchema } from '@devmanager/shared/dist/comment.schema';

export const getComments = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.query;
        if (!taskId) return res.status(400).json({ message: 'Task ID required' });

        const comments = await Comment.find({
            taskId,
            organizationId: req.user!.organizationId
        }).populate('userId', 'firstName lastName email').sort({ createdAt: 1 });

        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createComment = async (req: AuthRequest, res: Response) => {
    try {
        const validated = CommentSchema.parse(req.body);
        const comment = await Comment.create({
            ...validated,
            userId: req.user!.userId,
            organizationId: req.user!.organizationId,
        });

        // Populate user for immediate return
        await comment.populate('userId', 'firstName lastName email');

        res.status(201).json(comment);
    } catch (error: any) {
        if (error.issues) return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};
