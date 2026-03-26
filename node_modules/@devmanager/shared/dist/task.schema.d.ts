import { z } from 'zod';
export declare const TaskSchema: z.ZodObject<{
    projectId: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodAny>;
    status: z.ZodDefault<z.ZodEnum<["todo", "in_progress", "review", "done", "under_verification", "clarification", "clarified"]>>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    type: z.ZodDefault<z.ZodEnum<["task", "bug", "feature"]>>;
    assigneeId: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
    needsClarification: z.ZodDefault<z.ZodBoolean>;
    clarificationText: z.ZodOptional<z.ZodAny>;
    aiPrompt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "todo" | "in_progress" | "review" | "done" | "under_verification" | "clarification" | "clarified";
    type: "task" | "bug" | "feature";
    priority: "low" | "medium" | "high" | "urgent";
    projectId: string;
    title: string;
    needsClarification: boolean;
    description?: any;
    assigneeId?: string | undefined;
    dueDate?: string | undefined;
    clarificationText?: any;
    aiPrompt?: string | undefined;
}, {
    projectId: string;
    title: string;
    status?: "todo" | "in_progress" | "review" | "done" | "under_verification" | "clarification" | "clarified" | undefined;
    type?: "task" | "bug" | "feature" | undefined;
    description?: any;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    assigneeId?: string | undefined;
    dueDate?: string | undefined;
    needsClarification?: boolean | undefined;
    clarificationText?: any;
    aiPrompt?: string | undefined;
}>;
export type TaskInput = z.infer<typeof TaskSchema>;
