"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Organization_1 = __importDefault(require("../models/Organization"));
const auth_schema_1 = require("@devmanager/shared/dist/auth.schema");
const register = async (req, res) => {
    try {
        const validated = auth_schema_1.RegisterSchema.parse(req.body);
        // Check if user exists
        const existingUser = await User_1.default.findOne({ email: validated.email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Create Organization
        const org = await Organization_1.default.create({
            name: validated.organizationName,
            plan: 'free',
        });
        // Hash password
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(validated.password, salt);
        // Create User
        const user = await User_1.default.create({
            email: validated.email,
            passwordHash,
            firstName: validated.firstName,
            lastName: validated.lastName,
            organizationId: org._id,
            role: 'admin',
        });
        // Generate Token
        const token = jsonwebtoken_1.default.sign({ userId: user._id, organizationId: org._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
        res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role, organizationId: org._id } });
    }
    catch (error) {
        if (error.issues) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const validated = auth_schema_1.LoginSchema.parse(req.body);
        const user = await User_1.default.findOne({ email: validated.email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt_1.default.compare(validated.password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user._id, organizationId: user.organizationId, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, email: user.email, role: user.role, organizationId: user.organizationId } });
    }
    catch (error) {
        if (error.issues) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.login = login;
