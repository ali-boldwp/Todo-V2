"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireProfileImageSetup = exports.requireGithubSetupForTeamMembers = exports.requireAdmin = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
};
exports.authorize = authorize;
// Convenience middleware: admin only
exports.requireAdmin = (0, exports.authorize)(['admin']);
const requireGithubSetupForTeamMembers = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Authentication required' });
        if (!['manager', 'member'].includes(req.user.role)) {
            return next();
        }
        const user = await User_1.default.findById(req.user.userId).select('githubUsername githubUserId githubConnectedAt');
        const completed = !!user?.githubUsername && !!user?.githubUserId && !!user?.githubConnectedAt;
        if (!completed) {
            return res.status(403).json({ message: 'You must complete GitHub setup before accessing this feature.' });
        }
        next();
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};
exports.requireGithubSetupForTeamMembers = requireGithubSetupForTeamMembers;
const requireProfileImageSetup = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Authentication required' });
        const user = await User_1.default.findById(req.user.userId).select('profileImageUrl');
        const completed = !!user?.profileImageUrl;
        if (!completed) {
            return res.status(403).json({
                message: 'You must upload a profile image before accessing this feature.',
                code: 'PROFILE_SETUP_REQUIRED'
            });
        }
        next();
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};
exports.requireProfileImageSetup = requireProfileImageSetup;
