import { z } from 'zod';
export const TaskSchema = z.object({
    projectId: z.string().min(1),
    title: z.string().min(1),
    description: z.any().optional(),
    status: z.enum(['todo', 'in_progress', 'review', 'done', 'under_verification', 'clarification', 'clarified', 'client_approval']).default('todo'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    type: z.enum(['task', 'bug', 'feature']).default('task'),
    assigneeId: z.string().optional(),
    dueDate: z.string().optional(),
    needsClarification: z.boolean().default(false),
    clarificationText: z.any().optional(),
    aiPrompt: z.string().optional(),
});
