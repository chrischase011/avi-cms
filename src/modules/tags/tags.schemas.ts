import { z } from 'zod';
import { SlugSchema } from '../../common/slug.js';

export const CreateTag = z.object({
  name: z.string().trim().min(1, 'name is required').max(80),
  slug: SlugSchema.or(z.literal('')).optional(),
});
export type CreateTag = z.infer<typeof CreateTag>;

export const UpdateTag = CreateTag.partial().refine(
  (input) => Object.keys(input).length > 0,
  'nothing to update',
);
export type UpdateTag = z.infer<typeof UpdateTag>;
