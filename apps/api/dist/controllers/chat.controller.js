"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrGetProjectGroup = exports.createOrGetTeamGroup = exports.markConversationRead = exports.sendMessage = exports.getMessages = exports.createOrGetConversation = exports.getConversations = exports.getOnlineUsers = exports.getChatUsers = void 0;
const Conversation_1 = __importDefault(require("../models/Conversation"));
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
const Project_1 = __importDefault(require("../models/Project"));
const socket_1 = require("../socket");
const mongoose_1 = __importDefault(require("mongoose"));
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
const populateConversation = (query) => query
    .populate('participants', 'firstName lastName email role profileImageUrl')
    .populate('createdBy', 'firstName lastName email role profileImageUrl')
    .populate('projectId', 'name');
const enrichConversationsWithUnread = async (userId, conversations) => {
    const conversationIds = conversations.map((c) => c._id);
    if (!conversationIds.length)
        return conversations.map((c) => ({ ...c.toObject(), unreadCount: 0 }));
    const currentUserObjectId = new mongoose_1.default.Types.ObjectId(userId);
    const unreadRows = await Message_1.default.aggregate([
        {
            $match: {
                conversationId: { $in: conversationIds },
                senderId: { $ne: currentUserObjectId },
                readBy: { $nin: [currentUserObjectId] },
            },
        },
        {
            $group: {
                _id: '$conversationId',
                unreadCount: { $sum: 1 },
            },
        },
    ]);
    const unreadMap = new Map(unreadRows.map((r) => [String(r._id), Number(r.unreadCount || 0)]));
    return conversations.map((c) => {
        const obj = c.toObject();
        return {
            ...obj,
            unreadCount: unreadMap.get(String(c._id)) || 0,
        };
    });
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
            .select('firstName lastName email role profileImageUrl')
            .sort({ firstName: 1, lastName: 1 });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getChatUsers = getChatUsers;
const getOnlineUsers = async (req, res) => {
    try {
        if (!ensureInternalUser(req, res))
            return;
        res.json({ userIds: (0, socket_1.getOnlineUserIds)() });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOnlineUsers = getOnlineUsers;
const getConversations = async (req, res) => {
    try {
        if (!ensureInternalUser(req, res))
            return;
        const conversations = await populateConversation(Conversation_1.default.find({ participants: req.user.userId }))
            .sort({ lastMessageAt: -1, updatedAt: -1 });
        const enriched = await enrichConversationsWithUnread(req.user.userId, conversations);
        res.json(enriched);
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
        let conversation = await populateConversation(Conversation_1.default.findOne({
            participants: { $all: [req.user.userId, participantId] },
            type: 'direct',
            $expr: { $eq: [{ $size: '$participants' }, 2] },
        }));
        if (!conversation) {
            conversation = await Conversation_1.default.create({
                type: 'direct',
                participants: [req.user.userId, participantId],
            });
            await conversation.populate('participants', 'firstName lastName email role profileImageUrl');
            await conversation.populate('createdBy', 'firstName lastName email role profileImageUrl');
            await conversation.populate('projectId', 'name');
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
        const deliveryResult = await Message_1.default.updateMany({
            conversationId,
            senderId: { $ne: req.user.userId },
            deliveredTo: { $nin: [new mongoose_1.default.Types.ObjectId(req.user.userId)] },
        }, { $addToSet: { deliveredTo: req.user.userId } });
        if ((deliveryResult.modifiedCount || 0) > 0) {
            (0, socket_1.getIO)().to(`conversation:${conversationId}`).emit('chat:delivered', {
                conversationId,
                userId: req.user.userId,
            });
        }
        const messages = await Message_1.default.find({ conversationId })
            .populate('senderId', 'firstName lastName email role profileImageUrl')
            .populate('deliveredTo', 'firstName lastName email role profileImageUrl')
            .populate('readBy', 'firstName lastName email role profileImageUrl')
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
        const onlineUserIds = new Set((0, socket_1.getOnlineUserIds)());
        const deliveredTo = conversation.participants
            .map((id) => id.toString())
            .filter((participantId) => participantId !== req.user.userId && onlineUserIds.has(participantId));
        const message = await Message_1.default.create({
            conversationId,
            senderId: req.user.userId,
            deliveredTo,
            readBy: [req.user.userId],
            text,
        });
        await message.populate('senderId', 'firstName lastName email role profileImageUrl');
        await message.populate('deliveredTo', 'firstName lastName email role profileImageUrl');
        await message.populate('readBy', 'firstName lastName email role profileImageUrl');
        conversation.lastMessage = text;
        conversation.lastMessageAt = new Date();
        await conversation.save();
        await conversation.populate('participants', 'firstName lastName email role profileImageUrl');
        await conversation.populate('createdBy', 'firstName lastName email role profileImageUrl');
        await conversation.populate('projectId', 'name');
        const io = (0, socket_1.getIO)();
        io.to(`conversation:${conversationId}`).emit('chat:message', {
            conversationId,
            message,
        });
        if (deliveredTo.length > 0) {
            io.to(`conversation:${conversationId}`).emit('chat:delivered', {
                conversationId,
                userId: req.user.userId,
            });
        }
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
const markConversationRead = async (req, res) => {
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
        await Message_1.default.updateMany({ conversationId, senderId: { $ne: req.user.userId } }, { $addToSet: { deliveredTo: req.user.userId, readBy: req.user.userId } });
        const io = (0, socket_1.getIO)();
        io.to(`conversation:${conversationId}`).emit('chat:delivered', {
            conversationId,
            userId: req.user.userId,
        });
        io.to(`conversation:${conversationId}`).emit('chat:read', {
            conversationId,
            userId: req.user.userId,
        });
        conversation.participants.forEach((participantId) => {
            io.to(`user:${participantId.toString()}`).emit('chat:conversation:updated', { conversationId });
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.markConversationRead = markConversationRead;
const emitConversationCreated = (conversation) => {
    const io = (0, socket_1.getIO)();
    conversation.participants.forEach((user) => {
        const participantId = user?._id?.toString?.() || user.toString();
        io.to(`user:${participantId}`).emit('chat:conversation:updated', {
            conversationId: conversation._id,
        });
    });
};
const createOrGetTeamGroup = async (req, res) => {
    try {
        if (!ensureInternalUser(req, res))
            return;
        const name = `${req.body?.name || 'Team Room'}`.trim();
        const teamUsers = await User_1.default.find({
            role: { $in: INTERNAL_ROLES },
            isActive: true,
        }).select('_id');
        const participantIds = teamUsers.map((u) => u._id.toString());
        let conversation = await populateConversation(Conversation_1.default.findOne({ type: 'group', projectId: null, name }));
        if (!conversation) {
            conversation = await Conversation_1.default.create({
                type: 'group',
                name,
                participants: participantIds,
                createdBy: req.user.userId,
            });
            await conversation.populate('participants', 'firstName lastName email role profileImageUrl');
            await conversation.populate('createdBy', 'firstName lastName email role profileImageUrl');
            await conversation.populate('projectId', 'name');
        }
        else {
            conversation.participants = participantIds;
            await conversation.save();
            await conversation.populate('participants', 'firstName lastName email role profileImageUrl');
            await conversation.populate('createdBy', 'firstName lastName email role profileImageUrl');
            await conversation.populate('projectId', 'name');
        }
        emitConversationCreated(conversation);
        res.status(201).json(conversation);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createOrGetTeamGroup = createOrGetTeamGroup;
const createOrGetProjectGroup = async (req, res) => {
    try {
        if (!ensureInternalUser(req, res))
            return;
        const { projectId } = req.params;
        const project = await Project_1.default.findById(projectId).select('name members');
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        const internalUsers = await User_1.default.find({
            role: { $in: INTERNAL_ROLES },
            isActive: true,
            $or: [{ _id: { $in: project.members } }, { role: 'admin' }],
        }).select('_id');
        const participantIds = internalUsers.map((u) => u._id.toString());
        if (!participantIds.includes(req.user.userId)) {
            return res.status(403).json({ message: 'You are not allowed to create this project group' });
        }
        const groupName = `${project.name} Team`;
        let conversation = await populateConversation(Conversation_1.default.findOne({ type: 'group', projectId }));
        if (!conversation) {
            conversation = await Conversation_1.default.create({
                type: 'group',
                name: groupName,
                projectId,
                participants: participantIds,
                createdBy: req.user.userId,
            });
            await conversation.populate('participants', 'firstName lastName email role profileImageUrl');
            await conversation.populate('createdBy', 'firstName lastName email role profileImageUrl');
            await conversation.populate('projectId', 'name');
        }
        else {
            conversation.name = groupName;
            conversation.participants = participantIds;
            await conversation.save();
            await conversation.populate('participants', 'firstName lastName email role profileImageUrl');
            await conversation.populate('createdBy', 'firstName lastName email role profileImageUrl');
            await conversation.populate('projectId', 'name');
        }
        emitConversationCreated(conversation);
        res.status(201).json(conversation);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createOrGetProjectGroup = createOrGetProjectGroup;
