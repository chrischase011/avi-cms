import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { TestClient } from '@avijs/testing';
import { TINY_PNG, multipartBody, startTestApp, type TestApp } from '../test/helpers.js';

let app: TestApp;
let admin: TestClient;
before(async () => {
  app = await startTestApp({ SERVE_WEB: true });
  admin = await app.signIn('admin@test.local');
});
after(() => app?.close());

test('health and security headers', async () => {
  const res = await app.client.get('/health');
  assert.equal(res.text, 'ok');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.ok(res.headers.get('content-security-policy'));
  assert.ok(res.headers.get('x-request-id'));
});

test('unknown API routes stay JSON 404s, never the SPA', async () => {
  const res = await app.client.get('/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal((res.body as { statusCode: number }).statusCode, 404);
});

test('the SPA catch-all never leaves web/dist', async () => {
  const res = await app.client.get('/..%2F..%2Fpackage.json');
  assert.notEqual(res.text.includes('"avi-cms"'), true);
});

test('dashboard reports totals and six months', async () => {
  await admin.post('/api/posts', { title: 'One', status: 'published' });
  await admin.post('/api/posts', { title: 'Two' });
  const res = await admin.get('/api/dashboard');
  assert.equal(res.status, 200);
  const { stats, postsPerMonth, recentPosts } = (res.body as {
    data: { stats: Record<string, number>; postsPerMonth: { count: number }[]; recentPosts: unknown[] };
  }).data;
  assert.equal(stats['totalPosts'], 2);
  assert.equal(stats['publishedPosts'], 1);
  assert.equal(stats['draftPosts'], 1);
  assert.equal(stats['totalUsers'], 3);
  assert.equal(postsPerMonth.length, 6);
  assert.equal(postsPerMonth.at(-1)?.count, 1);
  assert.equal(recentPosts.length, 2);
});

test('settings: defaults, update with a logo, validation', async () => {
  const defaults = await admin.get('/api/settings');
  assert.equal((defaults.body as { data: { siteName: string } }).data.siteName, 'Avi CMS');

  const { body, headers } = multipartBody({ filename: 'logo.png', type: 'image/png', data: TINY_PNG });
  const logo = (await admin.post('/api/media', body, { headers })).body as { data: { id: number; url: string } };
  const res = await admin.put('/api/settings', { siteName: 'My Blog', logoId: logo.data.id, postsPerPage: 5 });
  assert.equal(res.status, 200);
  const data = (res.body as { data: { siteName: string; logoUrl: string; postsPerPage: number } }).data;
  assert.equal(data.siteName, 'My Blog');
  assert.equal(data.logoUrl, logo.data.url);

  assert.equal((await admin.put('/api/settings', { postsPerPage: 0 })).status, 400);
  assert.equal((await admin.put('/api/settings', { logoId: 999_999 })).status, 400);
  const pub = await app.client.get('/api/public/settings');
  assert.equal((pub.body as { data: { siteName: string } }).data.siteName, 'My Blog');
});

test('pages CRUD with SEO fields and duplicate slugs', async () => {
  const created = await admin.post('/api/pages', { title: 'Contact', seoTitle: 'Contact us' });
  assert.equal(created.status, 201);
  const id = (created.body as { data: { id: number } }).data.id;
  assert.equal((await admin.post('/api/pages', { title: 'Contact' })).status, 409);
  const published = await admin.post(`/api/pages/${String(id)}/publish`);
  assert.equal((published.body as { data: { status: string } }).data.status, 'published');
  assert.equal((await app.client.get('/api/public/pages/contact')).status, 200);
  assert.equal((await admin.delete(`/api/pages/${String(id)}`)).status, 204);
});

test('users: create, duplicate email, self-protection', async () => {
  const created = await admin.post('/api/users', {
    email: 'New@Test.local',
    name: 'New Person',
    role: 'author',
    password: 'long-enough-password',
  });
  assert.equal(created.status, 201);
  assert.equal((created.body as { data: { email: string } }).data.email, 'new@test.local');
  assert.equal(
    (await admin.post('/api/users', { email: 'new@test.local', name: 'X', role: 'author', password: 'long-enough-password' })).status,
    409,
  );
  assert.equal((await admin.post('/api/users', { email: 'a@b.c', name: 'X', role: 'author', password: 'short' })).status, 400);
  assert.equal((await admin.patch(`/api/users/${String(app.ids.admin)}`, { isActive: false })).status, 400);
  assert.equal((await admin.patch(`/api/users/${String(app.ids.admin)}`, { role: 'editor' })).status, 400);
});
