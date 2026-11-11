import { z } from 'zod';

/** Turns a title into a URL slug: "Hello, Wörld!" becomes "hello-world". */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

export const SlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug may contain lowercase letters, digits and dashes');

/** Uses the given slug, or one made from `fallback`; never empty. */
export function resolveSlug(slug: string | undefined, fallback: string): string {
  const value = slug && slug.length > 0 ? slug : slugify(fallback);
  return value.length > 0 ? value : `item-${Date.now().toString(36)}`;
}
