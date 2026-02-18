import { z } from 'zod';
export declare const AttendanceSchema: z.ZodObject<{
    checkInTime: z.ZodOptional<z.ZodString>;
    checkOutTime: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["present", "absent", "late", "half_day"]>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "present" | "absent" | "late" | "half_day";
    checkInTime?: string | undefined;
    checkOutTime?: string | undefined;
    date?: string | undefined;
    notes?: string | undefined;
}, {
    checkInTime?: string | undefined;
    checkOutTime?: string | undefined;
    date?: string | undefined;
    status?: "present" | "absent" | "late" | "half_day" | undefined;
    notes?: string | undefined;
}>;
export type AttendanceInput = z.infer<typeof AttendanceSchema>;
