// Drizzle schema. drizzle-kit reads this file directly, so it imports only packages.
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['admin', 'editor', 'author']);
export const contentStatus = pgEnum('content_status', ['draft', 'published', 'archived']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull().default('author'),
    isActive: boolean('is_active').notNull().default(true),
    /** Bumped on password change or deactivation, which ends every existing session. */
    tokenVersion: integer('token_version').notNull().default(0),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('users_email_unique').on(sql`lower(${t.email})`)],
);

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 160 }).notNull(),
    description: text('description').notNull().default(''),
    ...timestamps,
  },
  (t) => [uniqueIndex('categories_slug_unique').on(t.slug)],
);

export const tags = pgTable(
  'tags',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 80 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('tags_slug_unique').on(t.slug)],
);

export const media = pgTable(
  'media',
  {
    id: serial('id').primaryKey(),
    /** Generated storage key, e.g. 3f2a...e1.png. Never derived from the client's file name. */
    storageKey: varchar('storage_key', { length: 120 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    size: integer('size').notNull(),
    alt: varchar('alt', { length: 255 }).notNull().default(''),
    uploadedById: integer('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('media_storage_key_unique').on(t.storageKey),
    index('media_created_at_idx').on(t.createdAt),
  ],
);

export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 220 }).notNull(),
    excerpt: text('excerpt').notNull().default(''),
    content: text('content').notNull().default(''),
    status: contentStatus('status').notNull().default('draft'),
    featuredImageId: integer('featured_image_id').references(() => media.id, {
      onDelete: 'set null',
    }),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('posts_slug_unique').on(t.slug),
    index('posts_status_published_at_idx').on(t.status, t.publishedAt),
    index('posts_category_idx').on(t.categoryId),
    index('posts_author_idx').on(t.authorId),
    index('posts_updated_at_idx').on(t.updatedAt),
  ],
);

export const postTags = pgTable(
  'post_tags',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index('post_tags_tag_idx').on(t.tagId)],
);

export const pages = pgTable(
  'pages',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 220 }).notNull(),
    content: text('content').notNull().default(''),
    status: contentStatus('status').notNull().default('draft'),
    seoTitle: varchar('seo_title', { length: 200 }).notNull().default(''),
    seoDescription: varchar('seo_description', { length: 320 }).notNull().default(''),
    authorId: integer('author_id').references(() => users.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('pages_slug_unique').on(t.slug), index('pages_status_idx').on(t.status)],
);

/** One row per setting; values are validated by the settings module. */
export const settings = pgTable('settings', {
  key: varchar('key', { length: 80 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({ posts: many(posts) }));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  category: one(categories, { fields: [posts.categoryId], references: [categories.id] }),
  featuredImage: one(media, { fields: [posts.featuredImageId], references: [media.id] }),
  postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({ postTags: many(postTags) }));
export const categoriesRelations = relations(categories, ({ many }) => ({ posts: many(posts) }));

export const pagesRelations = relations(pages, ({ one }) => ({
  author: one(users, { fields: [pages.authorId], references: [users.id] }),
}));

export type UserRole = (typeof userRole.enumValues)[number];
export type ContentStatus = (typeof contentStatus.enumValues)[number];
export type UserRow = typeof users.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type PageRow = typeof pages.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
