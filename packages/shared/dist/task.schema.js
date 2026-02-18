import { z } from 'zod';
export const TaskSchema = z.object({
    projectId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    type: z.enum(['task', 'bug', 'feature']).default('task'),
    assigneeId: z.string().optional(),
    dueDate: z.string().optional(),
});
