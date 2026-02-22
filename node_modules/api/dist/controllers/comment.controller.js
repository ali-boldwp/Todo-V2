"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createComment = exports.getComments = void 0;
const Comment_1 = __importDefault(require("../models/Comment"));
const getComments = async (req, res) => {
    try {
        const { taskId } = req.params;
        const comments = await Comment_1.default.find({
            taskId,
            organizationId: req.user.organizationId
        }).populate('userId', 'firstName lastName email');
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
        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }
        const comment = await Comment_1.default.create({
            taskId,
            organizationId: req.user.organizationId,
            userId: req.user.userId,
            content
        });
        const populated = await comment.populate('userId', 'firstName lastName email');
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createComment = createComment;
