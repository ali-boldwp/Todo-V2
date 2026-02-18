import { z } from 'zod';
export declare const EpicSchema: z.ZodObject<{
    projectId: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["active", "completed", "archived"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "completed" | "archived";
    projectId: string;
    title: string;
    description?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    projectId: string;
    title: string;
    status?: "active" | "completed" | "archived" | undefined;
    description?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const SprintSchema: z.ZodObject<{
    projectId: z.ZodString;
    name: z.ZodString;
    goal: z.ZodOptional<z.ZodString>;
    startDate: z.ZodString;
    endDate: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["planned", "active", "completed"]>>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "completed" | "planned";
    name: string;
    startDate: string;
    endDate: string;
    projectId: string;
    goal?: string | undefined;
}, {
    name: string;
    startDate: string;
    endDate: string;
    projectId: string;
    status?: "active" | "completed" | "planned" | undefined;
    goal?: string | undefined;
}>;
export type EpicInput = z.infer<typeof EpicSchema>;
export type SprintInput = z.infer<typeof SprintSchema>;
