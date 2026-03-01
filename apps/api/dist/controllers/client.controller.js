"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteClient = exports.resetClientPassword = exports.toggleClientStatus = exports.createClient = exports.getClient = exports.getClients = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const Client_1 = __importDefault(require("../models/Client"));
const User_1 = __importDefault(require("../models/User"));
const client_schema_1 = require("@devmanager/shared/dist/client.schema");
const getClients = async (_req, res) => {
    try {
        const clients = await Client_1.default.find({});
        res.json(clients);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getClients = getClients;
const getClient = async (req, res) => {
    try {
        const client = await Client_1.default.findById(req.params.id);
        if (!client)
            return res.status(404).json({ message: 'Client not found' });
        res.json(client);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getClient = getClient;
const createClient = async (req, res) => {
    try {
        const validated = client_schema_1.ClientSchema.parse(req.body);
        // 1. Create the Client document
        const client = await Client_1.default.create({
            ...validated,
        });
        // 2. If email is provided, create a User account for the client
        if (validated.email) {
            const existingUser = await User_1.default.findOne({ email: validated.email });
            if (existingUser) {
                // Determine if we should fail or just link? 
                // For simplicity, let's warn but not fail certain creation, aka maybe they are already a member?
                // But for "Client" role, usually it's a new user. 
                // Let's assume strict email uniqueness for now as per User model.
                // We'll return the client but with a warning or just fail?
                // Let's fail if user exists to avoid complexity.
                return res.status(400).json({ message: 'User with this email already exists' });
            }
            const salt = await bcrypt_1.default.genSalt(10);
            const passwordHash = await bcrypt_1.default.hash('password123', salt); // Default password
            const user = await User_1.default.create({
                email: validated.email,
                passwordHash,
                firstName: validated.name.split(' ')[0] || 'Client',
                lastName: validated.name.split(' ')[1] || 'User',
                role: 'client',
                clientId: client._id
            });
            // Update client with userId
            client.userId = user._id;
            await client.save();
        }
        res.status(201).json(client);
    }
    catch (error) {
        if (error.issues)
            return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.createClient = createClient;
const toggleClientStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const client = await Client_1.default.findById(req.params.id);
        if (!client)
            return res.status(404).json({ message: 'Client not found' });
        client.status = status;
        await client.save();
        if (client.userId) {
            await User_1.default.findByIdAndUpdate(client.userId, {
                isActive: status === 'active'
            });
        }
        res.json(client);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.toggleClientStatus = toggleClientStatus;
const resetClientPassword = async (req, res) => {
    try {
        const client = await Client_1.default.findById(req.params.id);
        if (!client)
            return res.status(404).json({ message: 'Client not found' });
        if (!client.userId)
            return res.status(400).json({ message: 'Client has no associated user account' });
        const newPassword = Math.random().toString(36).slice(-8).concat('Aa1!'); // Generate stronger password
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(newPassword, salt);
        await User_1.default.findByIdAndUpdate(client.userId, { passwordHash });
        res.json({ message: 'Password reset successfully', password: newPassword });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.resetClientPassword = resetClientPassword;
const deleteClient = async (req, res) => {
    try {
        const client = await Client_1.default.findById(req.params.id);
        if (!client)
            return res.status(404).json({ message: 'Client not found' });
        if (client.userId) {
            await User_1.default.findByIdAndDelete(client.userId);
        }
        await Client_1.default.findByIdAndDelete(client._id);
        res.json({ message: 'Client deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteClient = deleteClient;
