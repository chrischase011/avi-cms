import { HttpError, Injectable } from '@avijs/core';
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import { rethrowDbError } from '../../common/db-errors.js';
import { likePattern, offsetOf, paginated } from '../../common/pagination.js';
import { sanitizeRichText } from '../../common/sanitize.js';
import { resolveSlug } from '../../common/slug.js';
import { Db } from '../../database/database.module.js';
import { postTags, posts, type ContentStatus, type MediaRow } from '../../database/schema.js';
import type { AuthUser } from '../auth/auth.types.js';
import { canManageContent } from '../auth/auth.guard.js';
import { MediaPresenter, type MediaDto } from '../media/media.presenter.js';
import type { CreatePost, PostQuery, UpdatePost } from './posts.schemas.js';

const ERRORS = {
  unique: 'A post with this slug already exists',
  reference: 'The category, a tag or the featured image does not exist',
  referenceStatus: 400,
} as const;

const RELATIONS = {
  author: { columns: { id: true, name: true } },
  category: { columns: { id: true, name: true, slug: true } },
  featuredImage: true,
  postTags: { with: { tag: { columns: { id: true, name: true, slug: true } } } },
} as const;

interface Loaded {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: ContentStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: number; name: string };
  category: { id: number; name: string; slug: string } | null;
  featuredImage: MediaRow | null;
  postTags: { tag: { id: number; name: string; slug: string } }[];
}

export interface PostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  status: ContentStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: number; name: string };
  category: { id: number; name: string; slug: string } | null;
  tags: { id: number; name: string; slug: string }[];
  featuredImage: MediaDto | null;
}
export interface PostDto extends PostSummary {
  content: string;
}

@Injectable()
export class PostsService {
  constructor(
    private readonly db: Db,
    private readonly media: MediaPresenter,
  ) {}

  async list(query: PostQuery, user: AuthUser) {
    const filters: (SQL | undefined)[] = [
      // Authors work on their own posts only.
      canManageContent(user.role)
        ? query.authorId !== undefined
          ? eq(posts.authorId, query.authorId)
          : undefined
        : eq(posts.authorId, user.id),
      query.status ? eq(posts.status, query.status) : undefined,
      query.categoryId !== undefined ? eq(posts.categoryId, query.categoryId) : undefined,
      query.tagId !== undefined
        ? inArray(
            posts.id,
            this.db.select({ id: postTags.postId }).from(postTags).where(eq(postTags.tagId, query.tagId)),
          )
        : undefined,
      query.search
        ? or(ilike(posts.title, likePattern(query.search)), ilike(posts.excerpt, likePattern(query.search)))
        : undefined,
    ];
    const where = and(...filters);
    const direction = query.order === 'asc' ? asc : desc;

    const [rows, [total]] = await Promise.all([
      this.db.query.posts.findMany({
        where,
        with: RELATIONS,
        orderBy: [direction(posts[query.sort]), direction(posts.id)],
        limit: query.pageSize,
        offset: offsetOf(query),
      }),
      this.db.select({ value: count() }).from(posts).where(where),
    ]);
    return paginated(rows.map((row) => this.#summary(row)), total?.value ?? 0, query);
  }

  /** Latest posts for the dashboard. */
  async latest(by: 'createdAt' | 'updatedAt', limit: number): Promise<PostSummary[]> {
    const rows = await this.db.query.posts.findMany({
      with: RELATIONS,
      orderBy: [desc(posts[by]), desc(posts.id)],
      limit,
    });
    return rows.map((row) => this.#summary(row));
  }

  async findOne(id: number, user: AuthUser): Promise<PostDto> {
    const row = await this.#load(id);
    this.#assertCanEdit(row, user);
    return this.#full(row);
  }

  async create(input: CreatePost, user: AuthUser): Promise<PostDto> {
    const status = input.status ?? 'draft';
    this.#assertCanSetStatus(status, user);
    let id: number;
    try {
      id = await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(posts)
          .values({
            title: input.title,
            slug: resolveSlug(input.slug, input.title),
            excerpt: input.excerpt ?? '',
            content: sanitizeRichText(input.content ?? ''),
            status,
            categoryId: input.categoryId ?? null,
            featuredImageId: input.featuredImageId ?? null,
            authorId: user.id,
            publishedAt: status === 'published' ? (input.publishedAt ?? new Date()) : (input.publishedAt ?? null),
          })
          .returning({ id: posts.id });
        if (!row) throw new Error('Insert returned no row');
        await this.#setTags(tx, row.id, input.tagIds ?? []);
        return row.id;
      });
    } catch (error) {
      rethrowDbError(error, ERRORS);
    }
    return this.#full(await this.#load(id));
  }

  async update(id: number, input: UpdatePost, user: AuthUser): Promise<PostDto> {
    const current = await this.#load(id);
    this.#assertCanEdit(current, user);
    if (input.status !== undefined && input.status !== current.status) {
      this.#assertCanSetStatus(input.status, user);
    }
    const status = input.status ?? current.status;
    const values = {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.slug !== undefined && { slug: resolveSlug(input.slug, input.title ?? current.title) }),
      ...(input.excerpt !== undefined && { excerpt: input.excerpt }),
      ...(input.content !== undefined && { content: sanitizeRichText(input.content) }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.featuredImageId !== undefined && { featuredImageId: input.featuredImageId }),
      ...(input.publishedAt !== undefined && { publishedAt: input.publishedAt }),
      status,
      ...this.#publishedAtFor(status, current, input.publishedAt),
    };
    try {
      await this.db.transaction(async (tx) => {
        await tx.update(posts).set(values).where(eq(posts.id, id));
        if (input.tagIds !== undefined) await this.#setTags(tx, id, input.tagIds);
      });
    } catch (error) {
      rethrowDbError(error, ERRORS);
    }
    return this.#full(await this.#load(id));
  }

  setStatus(id: number, status: ContentStatus, user: AuthUser): Promise<PostDto> {
    return this.update(id, { status }, user);
  }

  async remove(id: number, user: AuthUser): Promise<void> {
    const current = await this.#load(id);
    this.#assertCanEdit(current, user);
    await this.db.delete(posts).where(eq(posts.id, id));
  }

  /** Publishing stamps the date once; going back to draft clears it. */
  #publishedAtFor(status: ContentStatus, current: Loaded, requested: Date | null | undefined) {
    if (status === 'published' && !current.publishedAt && !requested) return { publishedAt: new Date() };
    if (status === 'draft' && current.status === 'published' && requested === undefined) return { publishedAt: null };
    return {};
  }

  async #setTags(tx: Pick<Db, 'insert' | 'delete'>, postId: number, tagIds: number[]) {
    await tx.delete(postTags).where(eq(postTags.postId, postId));
    const unique = [...new Set(tagIds)];
    if (unique.length > 0) await tx.insert(postTags).values(unique.map((tagId) => ({ postId, tagId })));
  }

  async #load(id: number): Promise<Loaded> {
    const row = await this.db.query.posts.findFirst({ where: eq(posts.id, id), with: RELATIONS });
    if (!row) throw new HttpError(404, 'Post not found');
    return row;
  }

  #assertCanEdit(post: Loaded, user: AuthUser) {
    if (!canManageContent(user.role) && post.author.id !== user.id) {
      throw new HttpError(403, 'You can only manage your own posts');
    }
  }

  #assertCanSetStatus(status: ContentStatus, user: AuthUser) {
    if (status !== 'draft' && !canManageContent(user.role)) {
      throw new HttpError(403, 'Only editors and administrators can publish or archive posts');
    }
  }

  #summary(row: Loaded): PostSummary {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      status: row.status,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: row.author,
      category: row.category,
      tags: row.postTags.map((link) => link.tag).sort((a, b) => a.name.localeCompare(b.name)),
      featuredImage: row.featuredImage ? this.media.present(row.featuredImage) : null,
    };
  }

  #full(row: Loaded): PostDto {
    return { ...this.#summary(row), content: row.content };
  }
}
