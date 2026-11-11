import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { TestClient } from '@avijs/testing';
import { startTestApp, type TestApp } from '../../test/helpers.js';

interface PostBody {
  id: number;
  slug: string;
  status: string;
  content: string;
  publishedAt: string | null;
  tags: { id: number }[];
  category: { id: number } | null;
  author: { id: number };
}
const data = (res: { body: unknown }) => (res.body as { data: PostBody }).data;

let app: TestApp;
let admin: TestClient;
let editor: TestClient;
let author: TestClient;
before(async () => {
  app = await startTestApp();
  [admin, editor, author] = await Promise.all([
    app.signIn('admin@test.local'),
    app.signIn('editor@test.local'),
    app.signIn('author@test.local'),
  ]);
});
after(() => app?.close());

describe('post CRUD', () => {
  test('creates a draft with a generated slug, category and tags', async () => {
    const category = await editor.post('/api/categories', { name: 'Guides' });
    const tag = await editor.post('/api/tags', { name: 'Node.js' });
    const categoryId = (category.body as { data: { id: number } }).data.id;
    const tagId = (tag.body as { data: { id: number; slug: string } }).data.id;
    assert.equal((tag.body as { data: { slug: string } }).data.slug, 'node-js');

    const res = await admin.post('/api/posts', { title: 'Hello, Wörld!', content: '<p>Hi</p>', categoryId, tagIds: [tagId, tagId] });
    assert.equal(res.status, 201);
    const post = data(res);
    assert.equal(post.slug, 'hello-world');
    assert.equal(post.status, 'draft');
    assert.equal(post.publishedAt, null);
    assert.equal(post.category?.id, categoryId);
    assert.deepEqual(post.tags.map((t) => t.id), [tagId]);
  });

  test('rejects a duplicate slug with 409', async () => {
    const res = await admin.post('/api/posts', { title: 'Another', slug: 'hello-world' });
    assert.equal(res.status, 409);
  });

  test('validates input and reports every issue', async () => {
    const res = await admin.post('/api/posts', { title: '', slug: 'Not A Slug', status: 'live' });
    assert.equal(res.status, 400);
    const paths = (res.body as { details: { issues: { path: string[] }[] } }).details.issues.map((i) => i.path[0]);
    assert.deepEqual(new Set(paths), new Set(['title', 'slug', 'status']));
  });

  test('rejects an unknown category with 400', async () => {
    const res = await admin.post('/api/posts', { title: 'Orphan', categoryId: 999_999 });
    assert.equal(res.status, 400);
  });

  test('sanitizes rich text before storing it', async () => {
    const res = await admin.post('/api/posts', {
        title: 'Unsafe',
        content: '<p onclick="steal()">ok</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)">',
      });
    const { content } = data(res);
    assert.doesNotMatch(content, /script|onclick|onerror|javascript:/i);
    assert.match(content, /<p>ok<\/p>/);
  });

  test('lists with search, status filter and pagination', async () => {
    for (let i = 1; i <= 3; i++) await admin.post('/api/posts', { title: `Paged ${String(i)}` });
    const res = await admin.get('/api/posts', { query: { search: 'paged', pageSize: '2', page: '2' } });
    assert.equal(res.status, 200);
    const body = res.body as { data: unknown[]; meta: { total: number; totalPages: number; page: number } };
    assert.equal(body.meta.total, 3);
    assert.equal(body.meta.totalPages, 2);
    assert.equal(body.data.length, 1);
    const drafts = await admin.get('/api/posts', { query: { status: 'published' } });
    assert.equal((drafts.body as { meta: { total: number } }).meta.total, 0);
  });

  test('updates and deletes', async () => {
    const created = data(await admin.post('/api/posts', { title: 'Temporary' }));
    const updated = await admin.patch(`/api/posts/${String(created.id)}`, { title: 'Renamed', slug: '' });
    assert.equal(data(updated).slug, 'renamed');
    assert.equal((await admin.delete(`/api/posts/${String(created.id)}`)).status, 204);
    assert.equal((await admin.get(`/api/posts/${String(created.id)}`)).status, 404);
  });
});

describe('publishing workflow', () => {
  test('publish stamps publishedAt, unpublish returns to draft', async () => {
    const post = data(await editor.post('/api/posts', { title: 'Launch day' }));
    const published = data(await editor.post(`/api/posts/${String(post.id)}/publish`));
    assert.equal(published.status, 'published');
    assert.ok(published.publishedAt);
    const again = data(await editor.post(`/api/posts/${String(post.id)}/unpublish`));
    assert.equal(again.status, 'draft');
    assert.equal(again.publishedAt, null);
  });
});

describe('authorization', () => {
  test('an author creates drafts but cannot publish', async () => {
    const draft = await author.post('/api/posts', { title: 'My draft' });
    assert.equal(draft.status, 201);
    const id = data(draft).id;
    assert.equal((await author.post('/api/posts', { title: 'Sneaky', status: 'published' })).status, 403);
    assert.equal((await author.patch(`/api/posts/${String(id)}`, { status: 'published' })).status, 403);
    assert.equal((await author.post(`/api/posts/${String(id)}/publish`)).status, 403);
  });

  test("an author cannot see or change someone else's post", async () => {
    const other = data(await admin.post('/api/posts', { title: 'Admin only' }));
    assert.equal((await author.get(`/api/posts/${String(other.id)}`)).status, 403);
    assert.equal((await author.patch(`/api/posts/${String(other.id)}`, { title: 'Mine now' })).status, 403);
    assert.equal((await author.delete(`/api/posts/${String(other.id)}`)).status, 403);
    const list = await author.get('/api/posts', { query: { pageSize: '100' } });
    const ids = (list.body as { data: PostBody[] }).data.map((p) => p.author.id);
    assert.ok(ids.every((id) => id === app.ids.author));
  });

  test('role gates on other modules', async () => {
    assert.equal((await author.get('/api/users')).status, 403);
    assert.equal((await editor.get('/api/users')).status, 403);
    assert.equal((await admin.get('/api/users')).status, 200);
    assert.equal((await author.get('/api/pages')).status, 403);
    assert.equal((await author.post('/api/categories', { name: 'Nope' })).status, 403);
    assert.equal((await editor.put('/api/settings', { siteName: 'Nope' })).status, 403);
    assert.equal((await app.client.get('/api/posts')).status, 401);
  });

  test('user responses never include password hashes', async () => {
    const res = await admin.get('/api/users');
    assert.doesNotMatch(res.text, /password|scrypt|tokenVersion/i);
  });
});
