import { z } from 'zod';

const slug = z.string().trim().toLowerCase().max(220);

export const PublicPostsQuery = z.object({
  page: z.string().regex(/^\d+$/).default('1').transform(Number).pipe(z.number().int().min(1)),
  /** Defaults to the postsPerPage setting. */
  pageSize: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().trim().max(200).optional(),
  category: slug.optional(),
  tag: slug.optional(),
});

export const SlugParam = z.object({ slug: slug.min(1) });

// Response schemas: whatever the service returns, only these fields reach the public.
const Ref = z.object({ name: z.string(), slug: z.string() });
const PublicPostSummary = z.object({
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  publishedAt: z.date().nullable(),
  updatedAt: z.date(),
  author: z.object({ name: z.string() }),
  category: Ref.nullable(),
  tags: z.array(Ref),
  featuredImage: z.object({ url: z.string(), alt: z.string() }).nullable(),
});
const Meta = z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() });

export const PublicPostList = z.object({ data: z.array(PublicPostSummary), meta: Meta });
export const PublicPostResponse = z.object({ data: PublicPostSummary.extend({ content: z.string() }) });
export const PublicPageResponse = z.object({
  data: z.object({
    title: z.string(),
    slug: z.string(),
    content: z.string(),
    seoTitle: z.string(),
    seoDescription: z.string(),
    publishedAt: z.date().nullable(),
    updatedAt: z.date(),
  }),
});
export const PublicTermList = z.object({
  data: z.array(Ref.extend({ description: z.string().optional(), postCount: z.number() })),
});
export const PublicSettingsResponse = z.object({
  data: z.object({
    siteName: z.string(),
    siteDescription: z.string(),
    siteUrl: z.string(),
    logoUrl: z.string().nullable(),
    faviconUrl: z.string().nullable(),
    defaultSeoTitle: z.string(),
    defaultSeoDescription: z.string(),
    postsPerPage: z.number(),
  }),
});
