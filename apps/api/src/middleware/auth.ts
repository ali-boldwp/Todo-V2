import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email?: string;
        role: string;
        clientId?: string;
        firstName?: string;
        lastName?: string;
        profileImageUrl?: string | null;
        profileSetupCompleted?: boolean;
        githubUsername?: string;
        githubSetupCompleted?: boolean;
    };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

export const authorize = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
};

// Convenience middleware: admin only
export const requireAdmin = authorize(['admin']);

export const requireGithubSetupForTeamMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Authentication required' });

        if (!['manager', 'member'].includes(req.user.role)) {
            return next();
        }

        // Skip if already completed (from JWT token)
        if (req.user.githubSetupCompleted === true) {
            return next();
        }

        // Only query DB if not cached
        const user = await User.findById(req.user.userId).select('githubUsername githubUserId githubConnectedAt').lean();
        const completed = !!user?.githubUsername && !!user?.githubUserId && !!user?.githubConnectedAt;
        if (!completed) {
            return res.status(403).json({ message: 'You must complete GitHub setup before accessing this feature.' });
        }

        // Cache for subsequent middleware
        req.user.githubSetupCompleted = true;
        next();
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};

export const requireProfileImageSetup = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Authentication required' });

        // Skip if already completed (from JWT token)
        if (req.user.profileSetupCompleted === true) {
            return next();
        }

        // Only query DB if not cached
        const user = await User.findById(req.user.userId).select('profileImageUrl').lean();
        if (!user?.profileImageUrl) {
            return res.status(403).json({
                message: 'You must upload a profile image before accessing this feature.',
                code: 'PROFILE_SETUP_REQUIRED'
            });
        }

        // Cache for subsequent middleware
        req.user.profileSetupCompleted = true;
        next();
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};
