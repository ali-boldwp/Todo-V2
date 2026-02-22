import { z } from 'zod';
export const ProjectSchema = z.object({
    clientId: z.string().optional(),
    name: z.string().min(1),
    description: z.any().optional(),
    status: z.enum(['active', 'completed', 'archived', 'on_hold', 'draft']).default('active'),
    visibility: z.enum(['public', 'private']).default('private'),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    githubRepoOwner: z.string().optional(),
    githubRepoName: z.string().optional(),
    createGithubRepo: z.boolean().optional(),
});
