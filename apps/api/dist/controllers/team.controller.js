"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetTeamMemberPassword = exports.deleteTeamMember = exports.updateTeamMember = exports.createTeamMember = exports.getTeamMembers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = __importDefault(require("../models/User"));
const getTeamMembers = async (_req, res) => {
    try {
        const members = await User_1.default.find({ role: { $in: ['admin', 'manager', 'member'] } })
            .select('-passwordHash')
            .sort({ createdAt: -1 });
        res.json(members);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTeamMembers = getTeamMembers;
const createTeamMember = async (req, res) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'firstName, lastName, email, and password are required' });
        }
        if (!['manager', 'member'].includes(role)) {
            return res.status(400).json({ message: 'Role must be manager or member' });
        }
        const existing = await User_1.default.findOne({ email });
        if (existing)
            return res.status(400).json({ message: 'User with this email already exists' });
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(password, salt);
        const user = await User_1.default.create({ firstName, lastName, email, passwordHash, role, isActive: true });
        const { passwordHash: _, ...userOut } = user.toObject();
        res.status(201).json(userOut);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.createTeamMember = createTeamMember;
const updateTeamMember = async (req, res) => {
    try {
        const { role, isActive } = req.body;
        const update = {};
        if (role && ['manager', 'member'].includes(role))
            update.role = role;
        if (typeof isActive === 'boolean')
            update.isActive = isActive;
        const user = await User_1.default.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash');
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateTeamMember = updateTeamMember;
const deleteTeamMember = async (req, res) => {
    try {
        // Prevent deleting yourself
        if (req.params.id === req.user.userId) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        const user = await User_1.default.findByIdAndDelete(req.params.id);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Team member deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteTeamMember = deleteTeamMember;
const resetTeamMemberPassword = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const newPassword = Math.random().toString(36).slice(-6) + 'Aa1!';
        const salt = await bcrypt_1.default.genSalt(10);
        user.passwordHash = await bcrypt_1.default.hash(newPassword, salt);
        await user.save();
        res.json({ message: 'Password reset successfully', password: newPassword });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.resetTeamMemberPassword = resetTeamMemberPassword;
