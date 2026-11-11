import { z } from 'zod';

const positive = (fallback: string, max?: number) => {
  const base = z.string().regex(/^\d+$/, 'must be a positive number').default(fallback).transform(Number);
  return base.pipe(max ? z.number().int().min(1).max(max) : z.number().int().min(1));
};

export const PageQuery = z.object({
  page: positive('1'),
  pageSize: positive('20', 100),
  search: z.string().trim().max(200).optional(),
});
export type PageQuery = z.infer<typeof PageQuery>;

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export function paginated<T>(data: T[], total: number, query: PageQuery): Paginated<T> {
  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export const offsetOf = (query: PageQuery) => (query.page - 1) * query.pageSize;

/** Escapes LIKE wildcards in user input. */
export const likePattern = (search: string) => `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export const IdParam = z.object({
  id: z.string().regex(/^\d+$/, 'id must be a number').transform(Number),
});
