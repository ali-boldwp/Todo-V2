import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Client from '../models/Client';
import { ClientSchema } from '@devmanager/shared/dist/client.schema';

export const getClients = async (req: AuthRequest, res: Response) => {
    try {
        const clients = await Client.find({ organizationId: req.user!.organizationId });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createClient = async (req: AuthRequest, res: Response) => {
    try {
        const validated = ClientSchema.parse(req.body);
        const client = await Client.create({
            ...validated,
            organizationId: req.user!.organizationId,
        });
        res.status(201).json(client);
    } catch (error: any) {
        if (error.issues) return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};
