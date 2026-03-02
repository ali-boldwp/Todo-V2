"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.getMessages = exports.createOrGetConversation = exports.getConversations = exports.getChatUsers = void 0;
const Conversation_1 = __importDefault(require("../models/Conversation"));
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
const socket_1 = require("../socket");
const INTERNAL_ROLES = ['admin', 'manager', 'member'];
const ensureInternalUser = (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return false;
    }
    if (!INTERNAL_ROLES.includes(req.user.role)) {
        res.status(403).json({ message: 'Clients are not allowed to use chat' });
        return false;
    }
    return true;
};
const getChatUsers = async (req, res) => {
    try {
        if (!ensureInternalUser(req, res))
            return;
        const users = await User_1.default.find({
            _id: { $ne: req.user.userId },
            role: { $in: INTERNAL_ROLES },
            isActive: true,
        })
            .select('firstName lastName email role')
            .sort({ firstName: 1, lastName: 1 });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getChatUsers = getChatUsers;
const getConversations = async (req, res) => {
    try {
        if (!ensureInternalUser(req, res))
            return;
        const conversations = await Conversation_1.default.find({ participants: req.user.userId })
            .populate('participants', 'firstName lastName email role')
            .sort({ lastMessageAt: -1, updatedAt: -1 });
        res.json(conversations);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getConversations = getConversations;
const createOrGetConversation = async (req, res) => {
    try {
        if (!ensureInternalUser(req, res))
            return;
        const { participantId } = req.body;
        if (!participantId)
            return res.status(400).json({ message: 'participantId is required' });
        if (participantId === req.user.userId)
            return res.status(400).json({ message: 'Cannot chat with yourself' });
        const participant = await User_1.default.findById(participantId).select('role isActive');
        if (!participant || !participant.isActive || !INTERNAL_ROLES.includes(participant.role)) {
            return res.status(400).json({ message: 'Invalid chat participant' });
        }
        let conversation = await Conversation_1.default.findOne({
            participants: { $all: [req.user.userId, participantId] },
            $expr: { $eq: [{ $size: '$participants' }, 2] },
        }).populate('participants', 'firstName lastName email role');
        if (!conversation) {
            conversation = await Conversation_1.default.create({
                participants: [req.user.userId, participantId],
            });
            await conversation.populate('participants', 'firstName lastName email role');
        }
        res.status(201).json(conversation);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createOrGetConversation = createOrGetConversation;
const getMessages = async (req, res) => {
    try {
        if (!ensureInternalUser(req, res))
            return;
        const { conversationId } = req.params;
        const conversation = await Conversation_1.default.findById(conversationId).select('participants');
        if (!conversation)
            return res.status(404).json({ message: 'Conversation not found' });
        const isParticipant = conversation.participants.some((id) => id.toString() === req.user.userId);
        if (!isParticipant)
            return res.status(403).json({ message: 'Not authorized for this conversation' });
        const messages = await Message_1.default.find({ conversationId })
            .populate('senderId', 'firstName lastName email role')
            .sort({ createdAt: 1 });
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMessages = getMessages;
const sendMessage = async (req, res) => {
    try {
        if (!ensureInternalUser(req, res))
            return;
        const { conversationId } = req.params;
        const text = `${req.body?.text || ''}`.trim();
        if (!text)
            return res.status(400).json({ message: 'Message text is required' });
        const conversation = await Conversation_1.default.findById(conversationId);
        if (!conversation)
            return res.status(404).json({ message: 'Conversation not found' });
        const isParticipant = conversation.participants.some((id) => id.toString() === req.user.userId);
        if (!isParticipant)
            return res.status(403).json({ message: 'Not authorized for this conversation' });
        const message = await Message_1.default.create({
            conversationId,
            senderId: req.user.userId,
            text,
        });
        await message.populate('senderId', 'firstName lastName email role');
        conversation.lastMessage = text;
        conversation.lastMessageAt = new Date();
        await conversation.save();
        await conversation.populate('participants', 'firstName lastName email role');
        const io = (0, socket_1.getIO)();
        io.to(`conversation:${conversationId}`).emit('chat:message', {
            conversationId,
            message,
        });
        conversation.participants.forEach((user) => {
            const participantId = user?._id?.toString?.() || user.toString();
            io.to(`user:${participantId}`).emit('chat:conversation:updated', {
                conversationId,
                lastMessage: conversation.lastMessage,
                lastMessageAt: conversation.lastMessageAt,
            });
        });
        res.status(201).json(message);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.sendMessage = sendMessage;
