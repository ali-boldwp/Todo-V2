import { z } from 'zod';
export declare const ProjectSchema: z.ZodObject<{
    clientId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodAny>;
    status: z.ZodDefault<z.ZodEnum<["active", "completed", "archived", "on_hold", "draft"]>>;
    visibility: z.ZodDefault<z.ZodEnum<["public", "private"]>>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    githubRepoOwner: z.ZodOptional<z.ZodString>;
    githubRepoName: z.ZodOptional<z.ZodString>;
    createGithubRepo: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "completed" | "archived" | "on_hold" | "draft";
    name: string;
    visibility: "public" | "private";
    priority: "low" | "medium" | "high";
    clientId?: string | undefined;
    description?: any;
    startDate?: string | undefined;
    endDate?: string | undefined;
    githubRepoOwner?: string | undefined;
    githubRepoName?: string | undefined;
    createGithubRepo?: boolean | undefined;
}, {
    name: string;
    status?: "active" | "completed" | "archived" | "on_hold" | "draft" | undefined;
    clientId?: string | undefined;
    description?: any;
    visibility?: "public" | "private" | undefined;
    priority?: "low" | "medium" | "high" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    githubRepoOwner?: string | undefined;
    githubRepoName?: string | undefined;
    createGithubRepo?: boolean | undefined;
}>;
export type ProjectInput = z.infer<typeof ProjectSchema>;
