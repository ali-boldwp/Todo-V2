import { z } from 'zod';
export declare const TimeEntrySchema: z.ZodObject<{
    taskId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    startTime: z.ZodString;
    endTime: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    isBillable: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startTime: string;
    isBillable: boolean;
    taskId?: string | undefined;
    description?: string | undefined;
    projectId?: string | undefined;
    endTime?: string | undefined;
    duration?: number | undefined;
}, {
    startTime: string;
    taskId?: string | undefined;
    description?: string | undefined;
    projectId?: string | undefined;
    endTime?: string | undefined;
    duration?: number | undefined;
    isBillable?: boolean | undefined;
}>;
export type TimeEntryInput = z.infer<typeof TimeEntrySchema>;
