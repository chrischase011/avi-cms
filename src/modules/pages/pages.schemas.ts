import { z } from 'zod';
import { PageQuery as BaseQuery } from '../../common/pagination.js';
import { SlugSchema } from '../../common/slug.js';

const Status = z.enum(['draft', 'published', 'archived']);

export const PagesQuery = BaseQuery.extend({ status: Status.optional() });
export type PagesQuery = z.infer<typeof PagesQuery>;

const fields = {
  title: z.string().trim().min(1, 'title is required').max(200),
  slug: SlugSchema.or(z.literal('')).optional(),
  content: z.string().max(500_000).optional(),
  status: Status.optional(),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(320).optional(),
};

export const CreatePage = z.object(fields);
export type CreatePage = z.infer<typeof CreatePage>;

export const UpdatePage = z
  .object(fields)
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'nothing to update');
export type UpdatePage = z.infer<typeof UpdatePage>;
