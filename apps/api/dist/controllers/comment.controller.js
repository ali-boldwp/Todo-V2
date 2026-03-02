"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createComment = exports.getComments = void 0;
const Comment_1 = __importDefault(require("../models/Comment"));
const Task_1 = __importDefault(require("../models/Task"));
const socket_1 = require("../socket");
const getComments = async (req, res) => {
    try {
        const { taskId } = req.params;
        const requestedType = req.query.type === 'clarification' ? 'clarification' : 'general';
        const query = { taskId };
        if (requestedType === 'clarification') {
            query.type = 'clarification';
        }
        else {
            query.$or = [{ type: 'general' }, { type: { $exists: false } }];
        }
        const comments = await Comment_1.default.find(query).populate('userId', 'firstName lastName email role');
        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getComments = getComments;
const createComment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { content } = req.body;
        const commentType = req.body.type === 'clarification' ? 'clarification' : 'general';
        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }
        const comment = await Comment_1.default.create({
            taskId,
            userId: req.user.userId,
            content,
            type: commentType,
        });
        const task = await Task_1.default.findById(taskId);
        if (task && commentType === 'clarification') {
            const internalRoles = ['admin', 'manager', 'member'];
            if (internalRoles.includes(req.user.role)) {
                // Internal team message opens/keeps clarification state.
                task.status = 'clarification';
                task.needsClarification = true;
            }
            else if (req.user.role === 'client' && task.status === 'clarification') {
                // Client response marks the clarification as addressed.
                task.status = 'clarified';
                task.needsClarification = false;
            }
            await task.save();
            if (task.projectId) {
                (0, socket_1.emitToProject)(task.projectId.toString(), 'task:updated', {
                    _id: task._id,
                    projectId: task.projectId,
                });
            }
        }
        const populated = await comment.populate('userId', 'firstName lastName email role');
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createComment = createComment;
