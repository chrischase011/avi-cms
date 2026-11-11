import { z } from 'zod';
import { PageQuery } from '../../../common/pagination.js';
import { PasswordSchema } from '../../auth/auth.schemas.js';

const Role = z.enum(['admin', 'editor', 'author']);
const email = z.string().trim().toLowerCase().email('Enter a valid email').max(255);
const name = z.string().trim().min(1, 'name is required').max(120);

export const UsersQuery = PageQuery.extend({
  role: Role.optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
export type UsersQuery = z.infer<typeof UsersQuery>;

export const CreateUserDto = z.object({
  email,
  name,
  role: Role,
  password: PasswordSchema,
  isActive: z.boolean().optional(),
});
export type CreateUserDto = z.infer<typeof CreateUserDto>;

export const UpdateUserDto = z
  .object({ email, name, role: Role, isActive: z.boolean() })
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'nothing to update');
export type UpdateUserDto = z.infer<typeof UpdateUserDto>;

export const SetPasswordDto = z.object({ password: PasswordSchema });

// Responses are checked against these and lose any field not listed: no password hash, no
// token version, whatever the service returns.
export const User = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  role: Role,
  isActive: z.boolean(),
  lastLoginAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof User>;

export const UserResponse = z.object({ data: User });
export const UserListResponse = z.object({
  data: z.array(User),
  meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() }),
});
