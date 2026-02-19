import { z } from 'zod';
export declare const TaskSchema: z.ZodObject<{
    projectId: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["todo", "in_progress", "review", "done"]>>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    type: z.ZodDefault<z.ZodEnum<["task", "bug", "feature"]>>;
    assigneeId: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "todo" | "in_progress" | "review" | "done";
    type: "task" | "bug" | "feature";
    priority: "low" | "medium" | "high" | "urgent";
    projectId: string;
    title: string;
    description?: string | undefined;
    assigneeId?: string | undefined;
    dueDate?: string | undefined;
}, {
    projectId: string;
    title: string;
    status?: "todo" | "in_progress" | "review" | "done" | undefined;
    type?: "task" | "bug" | "feature" | undefined;
    description?: string | undefined;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    assigneeId?: string | undefined;
    dueDate?: string | undefined;
}>;
export type TaskInput = z.infer<typeof TaskSchema>;
