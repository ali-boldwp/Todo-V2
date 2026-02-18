import { z } from 'zod';

export const ClientSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['internal', 'external']).default('external'),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
});

export type ClientInput = z.infer<typeof ClientSchema>;
