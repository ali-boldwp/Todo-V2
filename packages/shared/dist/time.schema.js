import { z } from 'zod';
export const TimeEntrySchema = z.object({
    taskId: z.string().optional(),
    projectId: z.string().optional(),
    description: z.string().optional(),
    startTime: z.string(),
    endTime: z.string().optional(),
    duration: z.number().optional(), // in minutes
    isBillable: z.boolean().default(true),
});
