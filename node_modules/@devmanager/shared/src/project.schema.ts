import { z } from 'zod';

const ProjectAccessAccountSchema = z.object({
    label: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(1),
    notes: z.string().optional(),
});

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
    projectUrl: z.string().url().optional().or(z.literal('')),
    devWebsiteUrl: z.string().url().optional().or(z.literal('')),
    accessAccounts: z.array(ProjectAccessAccountSchema).optional(),
    createGithubRepo: z.boolean().optional(),
});

export type ProjectInput = z.infer<typeof ProjectSchema>;
