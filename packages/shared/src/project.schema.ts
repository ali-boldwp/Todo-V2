import { z } from 'zod';

export const ProjectSchema = z.object({
    clientId: z.string().optional(),
    name: z.string().min(1),
    description: z.any().optional(),
    status: z.enum(['active', 'completed', 'archived', 'on_hold', 'draft']).default('active'),
    visibility: z.enum(['public', 'private']).default('private'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export type ProjectInput = z.infer<typeof ProjectSchema>;
