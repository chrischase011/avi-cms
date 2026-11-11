import { z } from 'zod';

export const LoginDto = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(255),
  password: z.string().min(1, 'Password is required').max(200),
});

export const PasswordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200, 'Password is too long');

export const ChangeOwnPasswordDto = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: PasswordSchema,
});

export const AuthUserDto = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'editor', 'author']),
});

export const SessionResponse = z.object({ data: AuthUserDto });
