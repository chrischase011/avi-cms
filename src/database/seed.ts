// npm run db:seed. Creates the administrator (see setup-admin.ts) and, on an empty database,
// sample content for development. Running it again changes nothing.
import { count } from 'drizzle-orm';
import { sanitizeRichText } from '../common/sanitize.js';
import { Config } from '../config.js';
import { ensureAdmin } from './admin.js';
import { createDb } from './database.module.js';
import { categories, pages, postTags, posts, settings, tags } from './schema.js';

const config = await Config.load();
const db = createDb(config.DATABASE_URL);

try {
  const admin = await ensureAdmin(db);
  console.log(`Administrator ${admin.email}: ${admin.status}.`);

  const [existing] = await db.select({ value: count() }).from(posts);
  if ((existing?.value ?? 0) > 0) {
    console.log('Content already exists; sample content skipped.');
  } else {
    await db.transaction(async (tx) => {
      const [news, tutorials, announcements] = await tx
        .insert(categories)
        .values([
          { name: 'News', slug: 'news', description: 'Updates about the project.' },
          { name: 'Tutorials', slug: 'tutorials', description: 'Step-by-step guides.' },
          { name: 'Announcements', slug: 'announcements', description: 'Releases and events.' },
        ])
        .returning();
      const tagRows = await tx
        .insert(tags)
        .values([
          { name: 'Avi.js', slug: 'avi-js' },
          { name: 'TypeScript', slug: 'typescript' },
          { name: 'Headless CMS', slug: 'headless-cms' },
          { name: 'React', slug: 'react' },
        ])
        .returning();
      const tag = (slug: string) => tagRows.find((row) => row.slug === slug)?.id ?? 0;
      const day = 24 * 60 * 60 * 1000;

      const samples = [
        {
          title: 'Welcome to Avi CMS',
          slug: 'welcome-to-avi-cms',
          excerpt: 'A headless CMS built with Avi.js, Drizzle and React.',
          content:
            '<h2>Hello!</h2><p>This is a sample post. Edit or delete it from the <strong>Posts</strong> screen.</p>',
          status: 'published' as const,
          categoryId: announcements?.id ?? null,
          publishedAt: new Date(Date.now() - 40 * day),
          tags: ['avi-js', 'headless-cms'],
        },
        {
          title: 'Consuming the public API',
          slug: 'consuming-the-public-api',
          excerpt: 'Fetch published posts from any frontend.',
          content:
            '<p>Published content is available at <code>/api/public/posts</code>. Drafts never are.</p><pre><code>fetch("/api/public/posts?tag=react")</code></pre>',
          status: 'published' as const,
          categoryId: tutorials?.id ?? null,
          publishedAt: new Date(Date.now() - 5 * day),
          tags: ['react', 'typescript'],
        },
        {
          title: 'Roadmap draft',
          slug: 'roadmap-draft',
          excerpt: 'Not public yet.',
          content: '<p>Ideas for the next release.</p>',
          status: 'draft' as const,
          categoryId: news?.id ?? null,
          publishedAt: null,
          tags: ['avi-js'],
        },
      ];
      for (const sample of samples) {
        const { tags: slugs, ...values } = sample;
        const [post] = await tx
          .insert(posts)
          .values({ ...values, content: sanitizeRichText(values.content), authorId: admin.id })
          .returning({ id: posts.id });
        if (post) await tx.insert(postTags).values(slugs.map((slug) => ({ postId: post.id, tagId: tag(slug) })));
      }

      await tx.insert(pages).values(
        [
          ['About', 'about', '<p>Tell visitors who you are.</p>'],
          ['Contact', 'contact', '<p>Write to us at hello@example.com.</p>'],
          ['Privacy Policy', 'privacy-policy', '<p>Describe how you handle personal data.</p>'],
        ].map(([title = '', slug = '', content = '']) => ({
          title,
          slug,
          content,
          status: 'published' as const,
          seoTitle: title,
          authorId: admin.id,
          publishedAt: new Date(),
        })),
      );

      await tx
        .insert(settings)
        .values([
          { key: 'siteName', value: 'Avi CMS' },
          { key: 'siteDescription', value: 'A headless CMS built with Avi.js' },
          { key: 'postsPerPage', value: 10 },
        ])
        .onConflictDoNothing();
    });
    console.log('Sample content created.');
  }
} finally {
  await db.$client.end();
}
