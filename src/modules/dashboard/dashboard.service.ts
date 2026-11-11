import { Injectable } from '@avijs/core';
import { and, count, eq, gte, sql } from 'drizzle-orm';
import { Db } from '../../database/database.module.js';
import { categories, media, pages, posts, tags, users } from '../../database/schema.js';
import { PagesService } from '../pages/pages.service.js';
import { PostsService } from '../posts/posts.service.js';

const MONTHS = 6;

@Injectable()
export class DashboardService {
  constructor(
    private readonly db: Db,
    private readonly posts: PostsService,
    private readonly pages: PagesService,
  ) {}

  async overview() {
    const [stats, recentPosts, recentlyUpdated, recentPages, postsPerMonth] = await Promise.all([
      this.#stats(),
      this.posts.latest('createdAt', 5),
      this.posts.latest('updatedAt', 5),
      this.pages.latest(5),
      this.#postsPerMonth(),
    ]);
    return { stats, recentPosts, recentlyUpdated, recentPages, postsPerMonth };
  }

  async #stats() {
    const total = async (table: typeof users | typeof pages | typeof categories | typeof tags | typeof media) => {
      const [row] = await this.db.select({ value: count() }).from(table);
      return row?.value ?? 0;
    };
    const [byStatus, totalPages, totalUsers, totalCategories, totalTags, totalMedia] = await Promise.all([
      this.db.select({ status: posts.status, value: count() }).from(posts).groupBy(posts.status),
      total(pages),
      total(users),
      total(categories),
      total(tags),
      total(media),
    ]);
    const of = (status: string) => byStatus.find((row) => row.status === status)?.value ?? 0;
    return {
      totalPosts: byStatus.reduce((sum, row) => sum + row.value, 0),
      publishedPosts: of('published'),
      draftPosts: of('draft'),
      archivedPosts: of('archived'),
      totalPages,
      totalUsers,
      totalCategories,
      totalTags,
      totalMedia,
    };
  }

  /** Published posts per month for the last six months, oldest first, empty months included. */
  async #postsPerMonth() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1));
    const month = sql<string>`to_char(date_trunc('month', ${posts.publishedAt} at time zone 'UTC'), 'YYYY-MM')`;
    const rows = await this.db
      .select({ month, value: count() })
      .from(posts)
      .where(and(eq(posts.status, 'published'), gte(posts.publishedAt, start)))
      .groupBy(month);
    return Array.from({ length: MONTHS }, (_, index) => {
      const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
      const key = date.toISOString().slice(0, 7);
      return { month: key, count: rows.find((row) => row.month === key)?.value ?? 0 };
    });
  }
}
