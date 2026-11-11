import { HttpError, Injectable } from '@avijs/core';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { likePattern, paginated } from '../../common/pagination.js';
import { Db } from '../../database/database.module.js';
import { categories, pages, postTags, posts, tags } from '../../database/schema.js';
import { MediaPresenter } from '../media/media.presenter.js';
import { SettingsService } from '../settings/settings.service.js';
import type { z } from 'zod';
import type { PublicPostsQuery } from './public.schemas.js';

const published = eq(posts.status, 'published');

const RELATIONS = {
  author: { columns: { name: true } },
  category: { columns: { name: true, slug: true } },
  featuredImage: { columns: { storageKey: true, alt: true } },
  postTags: { with: { tag: { columns: { name: true, slug: true } } } },
} as const;

/** Read-only, published-only content for headless consumers. */
@Injectable()
export class PublicService {
  constructor(
    private readonly db: Db,
    private readonly media: MediaPresenter,
    private readonly settings: SettingsService,
  ) {}

  async posts(input: z.infer<typeof PublicPostsQuery>) {
    const pageSize = input.pageSize ?? (await this.settings.get()).postsPerPage;
    const query = { page: input.page, pageSize };
    const where = and(
      published,
      input.search
        ? or(ilike(posts.title, likePattern(input.search)), ilike(posts.excerpt, likePattern(input.search)))
        : undefined,
      input.category
        ? inArray(posts.categoryId, this.db.select({ id: categories.id }).from(categories).where(eq(categories.slug, input.category)))
        : undefined,
      input.tag
        ? inArray(
            posts.id,
            this.db
              .select({ id: postTags.postId })
              .from(postTags)
              .innerJoin(tags, eq(tags.id, postTags.tagId))
              .where(eq(tags.slug, input.tag)),
          )
        : undefined,
    );
    const [rows, [total]] = await Promise.all([
      this.db.query.posts.findMany({
        where,
        with: RELATIONS,
        columns: { content: false },
        orderBy: [desc(posts.publishedAt), desc(posts.id)],
        limit: pageSize,
        offset: (input.page - 1) * pageSize,
      }),
      this.db.select({ value: count() }).from(posts).where(where),
    ]);
    return paginated(rows.map((row) => this.#present(row)), total?.value ?? 0, { ...query, search: undefined });
  }

  async post(slug: string) {
    const row = await this.db.query.posts.findFirst({
      where: and(published, eq(posts.slug, slug)),
      with: RELATIONS,
    });
    if (!row) throw new HttpError(404, 'Post not found');
    return { data: { ...this.#present(row), content: row.content } };
  }

  async page(slug: string) {
    const [row] = await this.db
      .select()
      .from(pages)
      .where(and(eq(pages.status, 'published'), eq(pages.slug, slug)))
      .limit(1);
    if (!row) throw new HttpError(404, 'Page not found');
    return { data: row };
  }

  async categories() {
    const rows = await this.db
      .select({
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        postCount: sql<number>`count(${posts.id}) filter (where ${published})`.mapWith(Number),
      })
      .from(categories)
      .leftJoin(posts, eq(posts.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(asc(categories.name));
    return { data: rows };
  }

  async tags() {
    const rows = await this.db
      .select({
        name: tags.name,
        slug: tags.slug,
        postCount: sql<number>`count(${posts.id}) filter (where ${published})`.mapWith(Number),
      })
      .from(tags)
      .leftJoin(postTags, eq(postTags.tagId, tags.id))
      .leftJoin(posts, eq(posts.id, postTags.postId))
      .groupBy(tags.id)
      .orderBy(asc(tags.name));
    return { data: rows };
  }

  async siteSettings() {
    return { data: await this.settings.get() };
  }

  #present(row: {
    title: string;
    slug: string;
    excerpt: string;
    publishedAt: Date | null;
    updatedAt: Date;
    author: { name: string };
    category: { name: string; slug: string } | null;
    featuredImage: { storageKey: string; alt: string } | null;
    postTags: { tag: { name: string; slug: string } }[];
  }) {
    return {
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      author: { name: row.author.name },
      category: row.category,
      tags: row.postTags.map((link) => link.tag),
      featuredImage: row.featuredImage
        ? { url: this.media.url(row.featuredImage.storageKey), alt: row.featuredImage.alt }
        : null,
    };
  }
}
