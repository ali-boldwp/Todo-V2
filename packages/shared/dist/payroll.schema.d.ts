import { z } from 'zod';
export declare const SalaryStructureSchema: z.ZodObject<{
    userId: z.ZodString;
    baseSalary: z.ZodNumber;
    allowances: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    deductions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    currency: z.ZodDefault<z.ZodString>;
    paymentInterval: z.ZodDefault<z.ZodEnum<["monthly", "weekly", "bi-weekly"]>>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    baseSalary: number;
    currency: string;
    paymentInterval: "monthly" | "weekly" | "bi-weekly";
    allowances?: Record<string, number> | undefined;
    deductions?: Record<string, number> | undefined;
}, {
    userId: string;
    baseSalary: number;
    allowances?: Record<string, number> | undefined;
    deductions?: Record<string, number> | undefined;
    currency?: string | undefined;
    paymentInterval?: "monthly" | "weekly" | "bi-weekly" | undefined;
}>;
export declare const PayslipSchema: z.ZodObject<{
    userId: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    grossSalary: z.ZodNumber;
    netSalary: z.ZodNumber;
    deductions: z.ZodNumber;
    additions: z.ZodNumber;
    status: z.ZodDefault<z.ZodEnum<["draft", "paid"]>>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "paid";
    startDate: string;
    endDate: string;
    userId: string;
    deductions: number;
    grossSalary: number;
    netSalary: number;
    additions: number;
}, {
    startDate: string;
    endDate: string;
    userId: string;
    deductions: number;
    grossSalary: number;
    netSalary: number;
    additions: number;
    status?: "draft" | "paid" | undefined;
}>;
export type SalaryStructureInput = z.infer<typeof SalaryStructureSchema>;
export type PayslipInput = z.infer<typeof PayslipSchema>;
