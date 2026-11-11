import { z } from 'zod';
import { SlugSchema } from '../../common/slug.js';

export const CreateCategory = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  slug: SlugSchema.or(z.literal('')).optional(),
  description: z.string().trim().max(1000).optional(),
});
export type CreateCategory = z.infer<typeof CreateCategory>;

export const UpdateCategory = CreateCategory.partial().refine(
  (input) => Object.keys(input).length > 0,
  'nothing to update',
);
export type UpdateCategory = z.infer<typeof UpdateCategory>;
