"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createComment = exports.getComments = void 0;
const Comment_1 = __importDefault(require("../models/Comment"));
const comment_schema_1 = require("@devmanager/shared/dist/comment.schema");
const getComments = async (req, res) => {
    try {
        const { taskId } = req.query;
        if (!taskId)
            return res.status(400).json({ message: 'Task ID required' });
        const comments = await Comment_1.default.find({
            taskId,
            organizationId: req.user.organizationId
        }).populate('userId', 'firstName lastName email').sort({ createdAt: 1 });
        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getComments = getComments;
const createComment = async (req, res) => {
    try {
        const validated = comment_schema_1.CommentSchema.parse(req.body);
        const comment = await Comment_1.default.create({
            ...validated,
            userId: req.user.userId,
            organizationId: req.user.organizationId,
        });
        // Populate user for immediate return
        await comment.populate('userId', 'firstName lastName email');
        res.status(201).json(comment);
    }
    catch (error) {
        if (error.issues)
            return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createComment = createComment;
