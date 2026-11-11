import { HttpError, Injectable } from '@avijs/core';
import { asc, count, eq, getTableColumns, ilike, or } from 'drizzle-orm';
import { rethrowDbError } from '../../common/db-errors.js';
import { likePattern, offsetOf, paginated, type PageQuery } from '../../common/pagination.js';
import { resolveSlug } from '../../common/slug.js';
import { Db } from '../../database/database.module.js';
import { postTags, tags } from '../../database/schema.js';
import type { CreateTag, UpdateTag } from './tags.schemas.js';

const DUPLICATE = { unique: 'A tag with this slug already exists' };

@Injectable()
export class TagsService {
  constructor(private readonly db: Db) {}

  async list(query: PageQuery) {
    const where = query.search
      ? or(ilike(tags.name, likePattern(query.search)), ilike(tags.slug, likePattern(query.search)))
      : undefined;
    const [rows, [total]] = await Promise.all([
      this.db
        .select({ ...getTableColumns(tags), postCount: count(postTags.postId) })
        .from(tags)
        .leftJoin(postTags, eq(postTags.tagId, tags.id))
        .where(where)
        .groupBy(tags.id)
        .orderBy(asc(tags.name))
        .limit(query.pageSize)
        .offset(offsetOf(query)),
      this.db.select({ value: count() }).from(tags).where(where),
    ]);
    return paginated(rows, total?.value ?? 0, query);
  }

  async findOne(id: number) {
    const [row] = await this.db
      .select({ ...getTableColumns(tags), postCount: count(postTags.postId) })
      .from(tags)
      .leftJoin(postTags, eq(postTags.tagId, tags.id))
      .where(eq(tags.id, id))
      .groupBy(tags.id);
    if (!row) throw new HttpError(404, 'Tag not found');
    return row;
  }

  async create(input: CreateTag) {
    try {
      const [row] = await this.db
        .insert(tags)
        .values({ name: input.name, slug: resolveSlug(input.slug, input.name) })
        .returning();
      if (!row) throw new Error('Insert returned no row');
      return { ...row, postCount: 0 };
    } catch (error) {
      rethrowDbError(error, DUPLICATE);
    }
  }

  async update(id: number, input: UpdateTag) {
    const values = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: resolveSlug(input.slug, input.name ?? (await this.findOne(id)).name) }),
    };
    try {
      const [row] = await this.db.update(tags).set(values).where(eq(tags.id, id)).returning();
      if (!row) throw new HttpError(404, 'Tag not found');
    } catch (error) {
      rethrowDbError(error, DUPLICATE);
    }
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const [row] = await this.db.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id });
    if (!row) throw new HttpError(404, 'Tag not found');
  }
}
