import { z } from 'zod';
export declare const CommentSchema: z.ZodObject<{
    taskId: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    taskId: string;
    content: string;
}, {
    taskId: string;
    content: string;
}>;
export type CommentInput = z.infer<typeof CommentSchema>;
