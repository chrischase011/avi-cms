import { HttpError, Injectable } from '@avijs/core';
import { asc, count, eq, getTableColumns, ilike, or } from 'drizzle-orm';
import { rethrowDbError } from '../../common/db-errors.js';
import { likePattern, offsetOf, paginated, type PageQuery } from '../../common/pagination.js';
import { resolveSlug } from '../../common/slug.js';
import { Db } from '../../database/database.module.js';
import { categories, posts } from '../../database/schema.js';
import type { CreateCategory, UpdateCategory } from './categories.schemas.js';

const DUPLICATE = { unique: 'A category with this slug already exists' };

@Injectable()
export class CategoriesService {
  constructor(private readonly db: Db) {}

  async list(query: PageQuery) {
    const where = query.search
      ? or(ilike(categories.name, likePattern(query.search)), ilike(categories.slug, likePattern(query.search)))
      : undefined;
    const [rows, [total]] = await Promise.all([
      this.db
        .select({ ...getTableColumns(categories), postCount: count(posts.id) })
        .from(categories)
        .leftJoin(posts, eq(posts.categoryId, categories.id))
        .where(where)
        .groupBy(categories.id)
        .orderBy(asc(categories.name))
        .limit(query.pageSize)
        .offset(offsetOf(query)),
      this.db.select({ value: count() }).from(categories).where(where),
    ]);
    return paginated(rows, total?.value ?? 0, query);
  }

  async findOne(id: number) {
    const [row] = await this.db
      .select({ ...getTableColumns(categories), postCount: count(posts.id) })
      .from(categories)
      .leftJoin(posts, eq(posts.categoryId, categories.id))
      .where(eq(categories.id, id))
      .groupBy(categories.id);
    if (!row) throw new HttpError(404, 'Category not found');
    return row;
  }

  async create(input: CreateCategory) {
    try {
      const [row] = await this.db
        .insert(categories)
        .values({
          name: input.name,
          slug: resolveSlug(input.slug, input.name),
          description: input.description ?? '',
        })
        .returning();
      if (!row) throw new Error('Insert returned no row');
      return { ...row, postCount: 0 };
    } catch (error) {
      rethrowDbError(error, DUPLICATE);
    }
  }

  async update(id: number, input: UpdateCategory) {
    const values = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: resolveSlug(input.slug, input.name ?? (await this.findOne(id)).name) }),
      ...(input.description !== undefined && { description: input.description }),
    };
    try {
      const [row] = await this.db.update(categories).set(values).where(eq(categories.id, id)).returning();
      if (!row) throw new HttpError(404, 'Category not found');
    } catch (error) {
      rethrowDbError(error, DUPLICATE);
    }
    return this.findOne(id);
  }

  /** Posts in the category become uncategorized (ON DELETE SET NULL). */
  async remove(id: number): Promise<void> {
    const [row] = await this.db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
    if (!row) throw new HttpError(404, 'Category not found');
  }
}
