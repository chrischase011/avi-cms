import { HttpError, Injectable } from '@avijs/core';
import { and, count, desc, eq, getTableColumns, ilike, or } from 'drizzle-orm';
import { rethrowDbError } from '../../common/db-errors.js';
import { likePattern, offsetOf, paginated } from '../../common/pagination.js';
import { sanitizeRichText } from '../../common/sanitize.js';
import { resolveSlug } from '../../common/slug.js';
import { Db } from '../../database/database.module.js';
import { pages, users, type ContentStatus, type PageRow } from '../../database/schema.js';
import type { AuthUser } from '../auth/auth.types.js';
import type { CreatePage, PagesQuery, UpdatePage } from './pages.schemas.js';

const DUPLICATE = { unique: 'A page with this slug already exists' };

type PageDto = Omit<PageRow, 'authorId'> & { author: { id: number; name: string } | null };
export type PageSummary = Omit<PageDto, 'content'>;

const { content: _content, authorId: _authorId, ...summaryColumns } = getTableColumns(pages);

@Injectable()
export class PagesService {
  constructor(private readonly db: Db) {}

  async list(query: PagesQuery) {
    const where = and(
      query.status ? eq(pages.status, query.status) : undefined,
      query.search
        ? or(ilike(pages.title, likePattern(query.search)), ilike(pages.slug, likePattern(query.search)))
        : undefined,
    );
    const [rows, [total]] = await Promise.all([
      this.#summaries().where(where).orderBy(desc(pages.updatedAt), desc(pages.id)).limit(query.pageSize).offset(offsetOf(query)),
      this.db.select({ value: count() }).from(pages).where(where),
    ]);
    return paginated(rows.map(withAuthor), total?.value ?? 0, query);
  }

  async latest(limit: number): Promise<PageSummary[]> {
    const rows = await this.#summaries().orderBy(desc(pages.updatedAt), desc(pages.id)).limit(limit);
    return rows.map(withAuthor);
  }

  async findOne(id: number): Promise<PageDto> {
    const [row] = await this.db
      .select({ ...summaryColumns, content: pages.content, authorId: users.id, authorName: users.name })
      .from(pages)
      .leftJoin(users, eq(users.id, pages.authorId))
      .where(eq(pages.id, id))
      .limit(1);
    if (!row) throw new HttpError(404, 'Page not found');
    return withAuthor(row);
  }

  async create(input: CreatePage, user: AuthUser): Promise<PageDto> {
    const status = input.status ?? 'draft';
    try {
      const [row] = await this.db
        .insert(pages)
        .values({
          title: input.title,
          slug: resolveSlug(input.slug, input.title),
          content: sanitizeRichText(input.content ?? ''),
          status,
          seoTitle: input.seoTitle ?? '',
          seoDescription: input.seoDescription ?? '',
          authorId: user.id,
          publishedAt: status === 'published' ? new Date() : null,
        })
        .returning({ id: pages.id });
      if (!row) throw new Error('Insert returned no row');
      return await this.findOne(row.id);
    } catch (error) {
      rethrowDbError(error, DUPLICATE);
    }
  }

  async update(id: number, input: UpdatePage): Promise<PageDto> {
    const current = await this.findOne(id);
    const status: ContentStatus = input.status ?? current.status;
    const values = {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.slug !== undefined && { slug: resolveSlug(input.slug, input.title ?? current.title) }),
      ...(input.content !== undefined && { content: sanitizeRichText(input.content) }),
      ...(input.seoTitle !== undefined && { seoTitle: input.seoTitle }),
      ...(input.seoDescription !== undefined && { seoDescription: input.seoDescription }),
      status,
      ...(status === 'published' && !current.publishedAt && { publishedAt: new Date() }),
      ...(status === 'draft' && current.status === 'published' && { publishedAt: null }),
    };
    try {
      await this.db.update(pages).set(values).where(eq(pages.id, id));
    } catch (error) {
      rethrowDbError(error, DUPLICATE);
    }
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const [row] = await this.db.delete(pages).where(eq(pages.id, id)).returning({ id: pages.id });
    if (!row) throw new HttpError(404, 'Page not found');
  }

  #summaries() {
    return this.db
      .select({ ...summaryColumns, authorId: users.id, authorName: users.name })
      .from(pages)
      .leftJoin(users, eq(users.id, pages.authorId))
      .$dynamic();
  }
}

function withAuthor<T extends { authorId: number | null; authorName: string | null }>(
  row: T,
): Omit<T, 'authorId' | 'authorName'> & { author: { id: number; name: string } | null } {
  const { authorId, authorName, ...rest } = row;
  return { ...rest, author: authorId !== null && authorName !== null ? { id: authorId, name: authorName } : null };
}
