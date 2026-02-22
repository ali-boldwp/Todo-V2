import { Response } from 'express';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

export const getTeamMembers = async (_req: AuthRequest, res: Response) => {
    try {
        const members = await User.find({ role: { $in: ['admin', 'manager', 'member'] } })
            .select('-passwordHash')
            .sort({ createdAt: -1 });
        res.json(members);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createTeamMember = async (req: AuthRequest, res: Response) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'firstName, lastName, email, and password are required' });
        }
        if (!['manager', 'member'].includes(role)) {
            return res.status(400).json({ message: 'Role must be manager or member' });
        }

        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ message: 'User with this email already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await User.create({ firstName, lastName, email, passwordHash, role, isActive: true });

        const { passwordHash: _, ...userOut } = (user as any).toObject();
        res.status(201).json(userOut);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const updateTeamMember = async (req: AuthRequest, res: Response) => {
    try {
        const { role, isActive } = req.body;
        const update: any = {};
        if (role && ['manager', 'member'].includes(role)) update.role = role;
        if (typeof isActive === 'boolean') update.isActive = isActive;

        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteTeamMember = async (req: AuthRequest, res: Response) => {
    try {
        // Prevent deleting yourself
        if (req.params.id === req.user!.userId) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Team member deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const resetTeamMemberPassword = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const newPassword = Math.random().toString(36).slice(-6) + 'Aa1!';
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password reset successfully', password: newPassword });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
