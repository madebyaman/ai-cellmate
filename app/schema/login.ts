import { z } from 'zod';

export const loginSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('email'),
    email: z.string().email({ message: 'Invalid email address' }),
    redirectTo: z.string().optional(),
  }),
  z.object({
    provider: z.literal('google'),
  }),
]);

export const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' }),
  name: z.string(),
  redirectTo: z.string().optional(),
  remember: z.boolean().optional(),
});
