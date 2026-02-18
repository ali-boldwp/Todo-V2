import { Response } from 'express';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';
import Client from '../models/Client';
import User from '../models/User';
import { ClientSchema } from '@devmanager/shared/dist/client.schema';

export const getClients = async (req: AuthRequest, res: Response) => {
    try {
        const clients = await Client.find({ organizationId: req.user!.organizationId });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getClient = async (req: AuthRequest, res: Response) => {
    try {
        const client = await Client.findOne({
            _id: req.params.id,
            organizationId: req.user!.organizationId
        });
        if (!client) return res.status(404).json({ message: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createClient = async (req: AuthRequest, res: Response) => {
    try {
        const validated = ClientSchema.parse(req.body);

        // 1. Create the Client document
        const client = await Client.create({
            ...validated,
            organizationId: req.user!.organizationId,
        });

        // 2. If email is provided, create a User account for the client
        if (validated.email) {
            const existingUser = await User.findOne({ email: validated.email });
            if (existingUser) {
                // Determine if we should fail or just link? 
                // For simplicity, let's warn but not fail certain creation, aka maybe they are already a member?
                // But for "Client" role, usually it's a new user. 
                // Let's assume strict email uniqueness for now as per User model.
                // We'll return the client but with a warning or just fail?
                // Let's fail if user exists to avoid complexity.
                return res.status(400).json({ message: 'User with this email already exists' });
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('password123', salt); // Default password

            const user = await User.create({
                email: validated.email,
                passwordHash,
                firstName: validated.name.split(' ')[0] || 'Client',
                lastName: validated.name.split(' ')[1] || 'User',
                role: 'client',
                organizationId: req.user!.organizationId,
                clientId: client._id
            });

            // Update client with userId
            client.userId = user._id as any;
            await client.save();
        }


        res.status(201).json(client);
    } catch (error: any) {
        if (error.issues) return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const toggleClientStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.body;
        const client = await Client.findOne({
            _id: req.params.id,
            organizationId: req.user!.organizationId
        });

        if (!client) return res.status(404).json({ message: 'Client not found' });

        client.status = status;
        await client.save();

        if (client.userId) {
            await User.findByIdAndUpdate(client.userId, {
                isActive: status === 'active'
            });
        }

        res.json(client);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const resetClientPassword = async (req: AuthRequest, res: Response) => {
    try {
        const client = await Client.findOne({
            _id: req.params.id,
            organizationId: req.user!.organizationId
        });

        if (!client) return res.status(404).json({ message: 'Client not found' });
        if (!client.userId) return res.status(400).json({ message: 'Client has no associated user account' });

        const newPassword = Math.random().toString(36).slice(-8).concat('Aa1!'); // Generate stronger password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await User.findByIdAndUpdate(client.userId, { passwordHash });

        res.json({ message: 'Password reset successfully', password: newPassword });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteClient = async (req: AuthRequest, res: Response) => {
    try {
        const client = await Client.findOne({
            _id: req.params.id,
            organizationId: req.user!.organizationId
        });

        if (!client) return res.status(404).json({ message: 'Client not found' });

        if (client.userId) {
            await User.findByIdAndDelete(client.userId);
        }

        await Client.findByIdAndDelete(client._id);

        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
