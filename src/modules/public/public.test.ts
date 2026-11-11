import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { TestClient } from '@avijs/testing';
import { startTestApp, type TestApp } from '../../test/helpers.js';

let app: TestApp;
let editor: TestClient;
before(async () => {
  app = await startTestApp();
  editor = await app.signIn('editor@test.local');
  const tag = await editor.post('/api/tags', { name: 'Visible' });
  const tagId = (tag.body as { data: { id: number } }).data.id;
  await editor.post('/api/posts', { title: 'Public post', status: 'published', tagIds: [tagId] });
  await editor.post('/api/posts', { title: 'Secret draft' });
  await editor.post('/api/posts', { title: 'Old news', status: 'archived' });
  await editor.post('/api/pages', { title: 'About', status: 'published', seoTitle: 'About us' });
  await editor.post('/api/pages', { title: 'Hidden page' });
});
after(() => app?.close());

test('lists only published posts, without private data', async () => {
  const res = await app.client.get('/api/public/posts');
  assert.equal(res.status, 200);
  const body = res.body as { data: { slug: string; author: object }[] };
  assert.deepEqual(body.data.map((post) => post.slug), ['public-post']);
  assert.deepEqual(Object.keys(body.data[0]?.author ?? {}), ['name']);
  assert.doesNotMatch(res.text, /@test\.local|"id"|authorId|status/);
});

test('drafts and archived posts are not found by slug', async () => {
  assert.equal((await app.client.get('/api/public/posts/public-post')).status, 200);
  assert.equal((await app.client.get('/api/public/posts/secret-draft')).status, 404);
  assert.equal((await app.client.get('/api/public/posts/old-news')).status, 404);
});

test('filters by tag slug', async () => {
  const res = await app.client.get('/api/public/posts', { query: { tag: 'visible' } });
  assert.equal((res.body as { meta: { total: number } }).meta.total, 1);
  const none = await app.client.get('/api/public/posts', { query: { tag: 'nothing' } });
  assert.equal((none.body as { meta: { total: number } }).meta.total, 0);
});

test('serves published pages only', async () => {
  const about = await app.client.get('/api/public/pages/about');
  assert.equal(about.status, 200);
  assert.equal((about.body as { data: { seoTitle: string } }).data.seoTitle, 'About us');
  assert.equal((await app.client.get('/api/public/pages/hidden-page')).status, 404);
});

test('tag counts include published posts only', async () => {
  const res = await app.client.get('/api/public/tags');
  assert.deepEqual((res.body as { data: unknown[] }).data, [{ name: 'Visible', slug: 'visible', postCount: 1 }]);
});

test('settings expose no media ids', async () => {
  const res = await app.client.get('/api/public/settings');
  assert.equal(res.status, 200);
  assert.doesNotMatch(res.text, /logoId|faviconId/);
});

test('allows any origin, read-only', async () => {
  const res = await app.client.get('/api/public/posts', { headers: { origin: 'https://blog.example.com' } });
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});
