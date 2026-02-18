import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import GithubConfig from '../models/GithubConfig';
import { GithubConfigSchema } from '@devmanager/shared/dist/github.schema';

export const getGithubConfig = async (req: AuthRequest, res: Response) => {
    try {
        const config = await GithubConfig.findOne({ organizationId: req.user!.organizationId });
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const saveGithubConfig = async (req: AuthRequest, res: Response) => {
    try {
        const validated = GithubConfigSchema.parse(req.body);
        const config = await GithubConfig.findOneAndUpdate(
            { organizationId: req.user!.organizationId },
            { ...validated, organizationId: req.user!.organizationId },
            { new: true, upsert: true }
        );
        res.json(config);
    } catch (error: any) {
        res.status(400).json({ errors: error.issues || error.message });
    }
};

export const syncIssues = async (req: AuthRequest, res: Response) => {
    try {
        const config = await GithubConfig.findOne({ organizationId: req.user!.organizationId });
        if (!config) {
            return res.status(400).json({ message: 'GitHub not configured' });
        }

        // Placeholder for actual GitHub API call
        // const response = await axios.get(`https://api.github.com/repos/${config.repoOwner}/${config.repoName}/issues`, {
        //   headers: { Authorization: `token ${config.personalAccessToken}` }
        // });

        // Logic to convert issues to Tasks would go here

        res.json({ message: 'Sync started successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
