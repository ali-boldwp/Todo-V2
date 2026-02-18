import { z } from 'zod';
export const SalaryStructureSchema = z.object({
    userId: z.string().min(1),
    baseSalary: z.number().positive(),
    allowances: z.record(z.string(), z.number()).optional(),
    deductions: z.record(z.string(), z.number()).optional(),
    currency: z.string().default('USD'),
    paymentInterval: z.enum(['monthly', 'weekly', 'bi-weekly']).default('monthly'), // fixed - remove extra space
});
export const PayslipSchema = z.object({
    userId: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
    grossSalary: z.number(),
    netSalary: z.number(),
    deductions: z.number(),
    additions: z.number(),
    status: z.enum(['draft', 'paid']).default('draft'),
});
