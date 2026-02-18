import { z } from 'zod';
export declare const ProjectSchema: z.ZodObject<{
    clientId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["active", "completed", "archived", "on_hold"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "completed" | "archived" | "on_hold";
    name: string;
    clientId?: string | undefined;
    description?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    name: string;
    status?: "active" | "completed" | "archived" | "on_hold" | undefined;
    clientId?: string | undefined;
    description?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export type ProjectInput = z.infer<typeof ProjectSchema>;
