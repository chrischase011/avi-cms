import { z } from 'zod';
import { PageQuery } from '../../common/pagination.js';
import { SlugSchema } from '../../common/slug.js';

const Status = z.enum(['draft', 'published', 'archived']);
const id = z.number().int().positive();
const idString = z.string().regex(/^\d+$/, 'must be a number').transform(Number);
const isoDate = z
  .string()
  .datetime({ offset: true, message: 'must be an ISO 8601 date' })
  .transform((value) => new Date(value));

export const PostQuery = PageQuery.extend({
  status: Status.optional(),
  categoryId: idString.optional(),
  tagId: idString.optional(),
  authorId: idString.optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'title']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type PostQuery = z.infer<typeof PostQuery>;

const fields = {
  title: z.string().trim().min(1, 'title is required').max(200),
  slug: SlugSchema.or(z.literal('')).optional(),
  excerpt: z.string().trim().max(1000).optional(),
  /** HTML from the editor; sanitized before it is stored. */
  content: z.string().max(500_000).optional(),
  status: Status.optional(),
  categoryId: id.nullable().optional(),
  tagIds: z.array(id).max(50).optional(),
  featuredImageId: id.nullable().optional(),
  publishedAt: isoDate.nullable().optional(),
};

export const CreatePost = z.object(fields);
export type CreatePost = z.infer<typeof CreatePost>;

export const UpdatePost = z
  .object(fields)
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'nothing to update');
export type UpdatePost = z.infer<typeof UpdatePost>;
