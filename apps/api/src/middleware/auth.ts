import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
        clientId?: string;
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

        const user = await User.findById(req.user.userId).select('githubUsername githubUserId githubConnectedAt');
        const completed = !!user?.githubUsername && !!user?.githubUserId && !!user?.githubConnectedAt;
        if (!completed) {
            return res.status(403).json({ message: 'You must complete GitHub setup before accessing this feature.' });
        }

        next();
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};
