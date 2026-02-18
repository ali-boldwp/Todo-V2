import { z } from 'zod';
export const GithubConfigSchema = z.object({
    personalAccessToken: z.string().min(1),
    repoOwner: z.string().min(1),
    repoName: z.string().min(1),
});
