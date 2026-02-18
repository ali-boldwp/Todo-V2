import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Organization from '../models/Organization';
import { RegisterSchema, LoginSchema } from '@devmanager/shared/dist/auth.schema';

export const register = async (req: Request, res: Response) => {
    try {
        const validated = RegisterSchema.parse(req.body);

        // Check if user exists
        const existingUser = await User.findOne({ email: validated.email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create Organization
        const org = await Organization.create({
            name: validated.organizationName,
            plan: 'free',
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(validated.password, salt);

        // Create User
        const user = await User.create({
            email: validated.email,
            passwordHash,
            firstName: validated.firstName,
            lastName: validated.lastName,
            organizationId: org._id,
            role: 'admin',
        });

        // Generate Token
        const token = jwt.sign(
            { userId: user._id, organizationId: org._id, role: user.role, clientId: user.clientId },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role, organizationId: org._id } });
    } catch (error: any) {
        if (error.issues) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const validated = LoginSchema.parse(req.body);

        const user = await User.findOne({ email: validated.email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(validated.password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, organizationId: user.organizationId, role: user.role, clientId: user.clientId },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        res.json({ token, user: { id: user._id, email: user.email, role: user.role, organizationId: user.organizationId } });
    } catch (error: any) {
        if (error.issues) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
