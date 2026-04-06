import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import GithubConfig from '../models/GithubConfig';
import { GithubConfigSchema } from '@devmanager/shared/dist/github.schema';

export const getGithubConfig = async (_req: AuthRequest, res: Response) => {
    try {
        const config = await GithubConfig.findOne();
        res.json(config);
    } catch (error: any) {
        console.error('getGithubConfig error:', error);
        res.json(null);
    }
};

export const saveGithubConfig = async (req: AuthRequest, res: Response) => {
    try {
        const validated = GithubConfigSchema.parse(req.body);
        const config = await GithubConfig.findOneAndUpdate(
            {},
            { ...validated },
            { new: true, upsert: true }
        );
        res.json(config);
    } catch (error: any) {
        res.status(400).json({ errors: error.issues || error.message });
    }
};

export const disconnectGithub = async (_req: AuthRequest, res: Response) => {
    try {
        await GithubConfig.deleteOne({});
        res.json({ message: 'GitHub disconnected successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getGithubAuthUrl = async (_req: AuthRequest, res: Response) => {
    try {
        const clientId = process.env.GITHUB_CLIENT_ID;
        if (!clientId) {
            return res.status(500).json({ message: 'GITHUB_CLIENT_ID not configured on server. Please add it to your .env file.' });
        }
        const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`;
        res.json({ url });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const handleGithubCallback = async (req: AuthRequest, res: Response) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: 'Authorization code is required' });
        }

        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return res.status(500).json({ message: 'GitHub OAuth credentials not configured on server' });
        }

        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
        });

        const data = await response.json();

        if (data.error) {
            console.error('handleGithubCallback error from GitHub API:', data.error, data.error_description);
            return res.status(400).json({ message: data.error_description || data.error });
        }

        const accessToken = data.access_token;
        if (!accessToken) {
            return res.status(400).json({ message: 'Failed to get access token from GitHub' });
        }

        const config = await GithubConfig.findOneAndUpdate(
            {},
            { personalAccessToken: accessToken },
            { new: true, upsert: true }
        );

        res.json({ message: 'Connected to GitHub successfully', config });
    } catch (error: any) {
        console.error('handleGithubCallback uncaught server error:', error.message, error.stack);
        res.status(500).json({ message: 'Server error during GitHub authentication', error: error.message });
    }
};

export const syncIssues = async (_req: AuthRequest, res: Response) => {
    try {
        const config = await GithubConfig.findOne();
        if (!config) {
            return res.status(400).json({ message: 'GitHub not configured' });
        }
        res.json({ message: 'Sync started successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getRepositories = async (_req: AuthRequest, res: Response) => {
    try {
        const config = await GithubConfig.findOne();
        if (!config || !config.personalAccessToken) {
            return res.status(400).json({ message: 'GitHub is not connected' });
        }

        const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
            headers: {
                Authorization: `Bearer ${config.personalAccessToken}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            const errData = await response.json();
            return res.status(response.status).json({ message: errData.message || 'Failed to fetch repositories from GitHub' });
        }

        const repoData = await response.json();
        const repos = repoData.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            private: repo.private,
            url: repo.html_url
        }));

        res.json(repos);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching repositories' });
    }
};
