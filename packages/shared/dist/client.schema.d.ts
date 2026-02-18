import { z } from 'zod';
export declare const ClientSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["internal", "external"]>>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "internal" | "external";
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
}, {
    name: string;
    type?: "internal" | "external" | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
}>;
export type ClientInput = z.infer<typeof ClientSchema>;
