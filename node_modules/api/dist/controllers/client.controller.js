"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = exports.getClients = void 0;
const Client_1 = __importDefault(require("../models/Client"));
const client_schema_1 = require("@devmanager/shared/dist/client.schema");
const getClients = async (req, res) => {
    try {
        const clients = await Client_1.default.find({ organizationId: req.user.organizationId });
        res.json(clients);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getClients = getClients;
const createClient = async (req, res) => {
    try {
        const validated = client_schema_1.ClientSchema.parse(req.body);
        const client = await Client_1.default.create({
            ...validated,
            organizationId: req.user.organizationId,
        });
        res.status(201).json(client);
    }
    catch (error) {
        if (error.issues)
            return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createClient = createClient;
