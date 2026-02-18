import { z } from 'zod';
export declare const GithubConfigSchema: z.ZodObject<{
    personalAccessToken: z.ZodString;
    repoOwner: z.ZodString;
    repoName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    personalAccessToken: string;
    repoOwner: string;
    repoName: string;
}, {
    personalAccessToken: string;
    repoOwner: string;
    repoName: string;
}>;
export type GithubConfigInput = z.infer<typeof GithubConfigSchema>;
