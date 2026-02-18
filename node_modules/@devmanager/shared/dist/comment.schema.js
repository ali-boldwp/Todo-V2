import { z } from 'zod';
export const CommentSchema = z.object({
    taskId: z.string().min(1),
    content: z.string().min(1),
});
