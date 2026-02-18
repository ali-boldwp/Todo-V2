import { z } from 'zod';
export const EpicSchema = z.object({
    projectId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    status: z.enum(['active', 'completed', 'archived']).default('active'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});
export const SprintSchema = z.object({
    projectId: z.string().min(1),
    name: z.string().min(1),
    goal: z.string().optional(),
    startDate: z.string(),
    endDate: z.string(),
    status: z.enum(['planned', 'active', 'completed']).default('planned'),
});
