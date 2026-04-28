"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGithubSetupCallback = exports.getGithubSetupStatus = exports.getGithubSetupUrl = exports.login = exports.register = exports.uploadProfileImage = exports.getProfileSetupStatus = exports.buildAuthResponse = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const auth_schema_1 = require("@devmanager/shared/dist/auth.schema");
const isGithubSetupCompleted = (user) => !!user.githubUsername && !!user.githubUserId && !!user.githubConnectedAt;
const isProfileSetupCompleted = (user) => !!user.profileImageUrl;
const buildAuthResponse = (user) => {
    const githubSetupCompleted = isGithubSetupCompleted(user);
    const profileSetupCompleted = isProfileSetupCompleted(user);
    const token = jsonwebtoken_1.default.sign({
        userId: user._id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        firstName: user.firstName,
        lastName: user.lastName,
        profileSetupCompleted,
        githubUsername: user.githubUsername,
        githubSetupCompleted
    }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    return {
        token,
        user: {
            id: user._id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl || null,
            profileSetupCompleted,
            githubUsername: user.githubUsername,
            githubSetupCompleted
        }
    };
};
exports.buildAuthResponse = buildAuthResponse;
const getProfileSetupStatus = async (req, res) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const user = await User_1.default.findById(req.user.userId)
            .select('firstName lastName email role profileImageUrl profileImageUploadedAt');
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        res.json({
            profileSetupCompleted: isProfileSetupCompleted(user),
            profileImageUrl: user.profileImageUrl || null,
            profileImageUploadedAt: user.profileImageUploadedAt || null,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getProfileSetupStatus = getProfileSetupStatus;
const uploadProfileImage = async (req, res) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const imageData = `${req.body?.imageData || ''}`.trim();
        if (!imageData) {
            return res.status(400).json({ message: 'imageData is required' });
        }
        if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(imageData)) {
            return res.status(400).json({ message: 'Only base64 image data URLs are allowed (png, jpg, jpeg, webp, gif).' });
        }
        if (imageData.length > 2000000) {
            return res.status(400).json({ message: 'Profile image is too large. Please upload a smaller file.' });
        }
        const user = await User_1.default.findByIdAndUpdate(req.user.userId, {
            profileImageUrl: imageData,
            profileImageUploadedAt: new Date(),
        }, { new: true });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        res.json((0, exports.buildAuthResponse)(user));
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.uploadProfileImage = uploadProfileImage;
const register = async (req, res) => {
    try {
        const validated = auth_schema_1.RegisterSchema.parse(req.body);
        // Check if user exists
        const existingUser = await User_1.default.findOne({ email: validated.email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Hash password
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(validated.password, salt);
        // Create User
        const user = await User_1.default.create({
            email: validated.email,
            passwordHash,
            firstName: validated.firstName,
            lastName: validated.lastName,
            role: 'admin',
        });
        // Generate Token
        res.status(201).json((0, exports.buildAuthResponse)(user));
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
        if (user.isActive === false) {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        }
        const isMatch = await bcrypt_1.default.compare(validated.password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        res.json((0, exports.buildAuthResponse)(user));
    }
    catch (error) {
        if (error.issues) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.login = login;
const getGithubSetupUrl = async (req, res) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const clientId = process.env.GITHUB_CLIENT_ID;
        if (!clientId) {
            return res.status(500).json({ message: 'GITHUB_CLIENT_ID not configured on server' });
        }
        const state = jsonwebtoken_1.default.sign({ userId: req.user.userId, type: 'github_setup' }, process.env.JWT_SECRET || 'secret', { expiresIn: '10m' });
        const callbackUrl = process.env.GITHUB_SETUP_CALLBACK_URL || `${process.env.API_BASE_URL || 'http://localhost:3030'}/api/auth/github/setup/callback`;
        const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user%20user:email&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(callbackUrl)}`;
        res.json({ url });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getGithubSetupUrl = getGithubSetupUrl;
const getGithubSetupStatus = async (req, res) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const user = await User_1.default.findById(req.user.userId).select('githubUsername githubUserId githubConnectedAt');
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        res.json({
            githubSetupCompleted: isGithubSetupCompleted(user),
            githubUsername: user.githubUsername || null,
            githubConnectedAt: user.githubConnectedAt || null
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getGithubSetupStatus = getGithubSetupStatus;
const handleGithubSetupCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        if (!code || !state) {
            return res.redirect(`${frontendBaseUrl}/github/setup?error=missing_code_or_state`);
        }
        let decodedState;
        try {
            decodedState = jsonwebtoken_1.default.verify(state, process.env.JWT_SECRET || 'secret');
        }
        catch {
            return res.redirect(`${frontendBaseUrl}/github/setup?error=invalid_or_expired_state`);
        }
        if (!decodedState?.userId || decodedState?.type !== 'github_setup') {
            return res.redirect(`${frontendBaseUrl}/github/setup?error=invalid_state_payload`);
        }
        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return res.redirect(`${frontendBaseUrl}/github/setup?error=github_oauth_not_configured`);
        }
        const callbackUrl = process.env.GITHUB_SETUP_CALLBACK_URL || `${process.env.API_BASE_URL || 'http://localhost:3030'}/api/auth/github/setup/callback`;
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: callbackUrl
            })
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) {
            return res.redirect(`${frontendBaseUrl}/github/setup?error=github_token_exchange_failed`);
        }
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
        if (!userResponse.ok) {
            return res.redirect(`${frontendBaseUrl}/github/setup?error=github_user_fetch_failed`);
        }
        const githubUser = await userResponse.json();
        if (!githubUser?.login || !githubUser?.id) {
            return res.redirect(`${frontendBaseUrl}/github/setup?error=invalid_github_user`);
        }
        const user = await User_1.default.findByIdAndUpdate(decodedState.userId, {
            githubUsername: githubUser.login,
            githubUserId: String(githubUser.id),
            githubProfileUrl: githubUser.html_url,
            githubConnectedAt: new Date()
        }, { new: true });
        if (!user) {
            return res.redirect(`${frontendBaseUrl}/github/setup?error=user_not_found`);
        }
        const authPayload = (0, exports.buildAuthResponse)(user);
        return res.redirect(`${frontendBaseUrl}/github/setup?success=1&token=${encodeURIComponent(authPayload.token)}&username=${encodeURIComponent(user.githubUsername || '')}`);
    }
    catch (error) {
        const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        return res.redirect(`${frontendBaseUrl}/github/setup?error=server_error`);
    }
};
exports.handleGithubSetupCallback = handleGithubSetupCallback;
