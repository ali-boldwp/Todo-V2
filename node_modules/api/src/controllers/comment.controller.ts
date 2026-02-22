import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Comment from '../models/Comment';

export const getComments = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.params;
        const comments = await Comment.find({ taskId }).populate('userId', 'firstName lastName email');

        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createComment = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }

        const comment = await Comment.create({
            taskId,
            userId: req.user!.userId,
            content
        });

        const populated = await comment.populate('userId', 'firstName lastName email');
        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
