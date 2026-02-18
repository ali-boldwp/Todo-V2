import { z } from 'zod';
export declare const ProjectSchema: z.ZodObject<{
    clientId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodAny>;
    status: z.ZodDefault<z.ZodEnum<["active", "completed", "archived", "on_hold", "draft"]>>;
    visibility: z.ZodDefault<z.ZodEnum<["public", "private"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "completed" | "archived" | "on_hold" | "draft";
    name: string;
    visibility: "public" | "private";
    clientId?: string | undefined;
    description?: any;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    name: string;
    status?: "active" | "completed" | "archived" | "on_hold" | "draft" | undefined;
    clientId?: string | undefined;
    description?: any;
    visibility?: "public" | "private" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export type ProjectInput = z.infer<typeof ProjectSchema>;
