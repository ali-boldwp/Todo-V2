import { z } from 'zod';
export const AttendanceSchema = z.object({
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    date: z.string().optional(), // ISO date string
    status: z.enum(['present', 'absent', 'late', 'half_day']).default('present'),
    notes: z.string().optional(),
});
