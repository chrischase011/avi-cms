import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { users } from '../../database/schema.js';
import { cookieHeader, cookieJar, signIn, startTestApp, type TestApp } from '../../test/helpers.js';

let app: TestApp;
before(async () => {
  app = await startTestApp();
});
after(() => app?.close());

describe('authentication', () => {
  test('rejects a wrong password with 401 and the same message as an unknown email', async () => {
    const csrf = await app.client.get('/api/auth/csrf');
    const jar = cookieJar(csrf.headers.getSetCookie());
    const headers = { cookie: cookieHeader(jar), 'x-csrf-token': decodeURIComponent(jar['avi_cms_csrf'] ?? '') };

    const wrong = await app.client.post('/api/auth/login', { email: 'admin@test.local', password: 'nope-nope-nope' }, { headers });
    const unknown = await app.client.post('/api/auth/login', { email: 'ghost@test.local', password: 'nope-nope-nope' }, { headers });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
  });

  test('signs in with an HTTP-only session cookie and returns no secrets', async () => {
    const csrf = await app.client.get('/api/auth/csrf');
    const jar = cookieJar(csrf.headers.getSetCookie());
    const res = await app.client.post('/api/auth/login', { email: 'ADMIN@test.local', password: 'correct-horse-battery' }, { headers: { cookie: cookieHeader(jar), 'x-csrf-token': decodeURIComponent(jar['avi_cms_csrf'] ?? '') } });
    assert.equal(res.status, 200);
    const session = res.headers.getSetCookie().find((cookie) => cookie.startsWith('avi_cms_session='));
    assert.ok(session, 'session cookie set');
    assert.match(session, /HttpOnly/);
    assert.match(session, /SameSite=Lax/);
    assert.deepEqual(Object.keys((res.body as { data: object }).data).sort(), ['email', 'id', 'name', 'role']);
  });

  test('GET /api/auth/me needs a session', async () => {
    assert.equal((await app.client.get('/api/auth/me')).status, 401);
    const admin = await app.signIn('admin@test.local');
    const me = await admin.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal((me.body as { data: { role: string } }).data.role, 'admin');
  });

  test('rejects a tampered session token', async () => {
    const res = await app.client.get('/api/auth/me', { headers: { cookie: 'avi_cms_session=eyJhbGciOiJIUzI1NiJ9.e30.bad' } });
    assert.equal(res.status, 401);
    // The dead cookie is cleared.
    assert.ok(res.headers.getSetCookie().some((cookie) => cookie.includes('Max-Age=0')));
  });

  test('state-changing requests need the CSRF token', async () => {
    const admin = await app.signIn('admin@test.local');
    const withoutToken = await admin.post('/api/tags', { name: 'x' }, { headers: { 'x-csrf-token': '' } });
    assert.equal(withoutToken.status, 403);
    const wrongToken = await admin.post('/api/tags', { name: 'x' }, { headers: { 'x-csrf-token': 'forged' } });
    assert.equal(wrongToken.status, 403);
    assert.equal((await admin.post('/api/tags', { name: 'x' })).status, 201);
  });

  test('deactivating an account ends its sessions at once', async () => {
    const author = await app.signIn('author@test.local');
    assert.equal((await author.get('/api/auth/me')).status, 200);
    const admin = await app.signIn('admin@test.local');
    assert.equal((await admin.patch(`/api/users/${String(app.ids.author)}`, { isActive: false })).status, 200);
    assert.equal((await author.get('/api/auth/me')).status, 401);
    await app.db.update(users).set({ isActive: true }).where(eq(users.id, app.ids.author));
  });

  test('changing the password signs out other sessions but keeps this one', async () => {
    const first = await app.signIn('editor@test.local');
    const second = await app.signIn('editor@test.local');
    const res = await second.post('/api/auth/password', { currentPassword: 'correct-horse-battery', newPassword: 'another-long-password' });
    assert.equal(res.status, 204);
    assert.equal((await first.get('/api/auth/me')).status, 401);
    const refreshed = second.withHeaders({
      cookie: `${res.headers.getSetCookie()[0]?.split(';')[0] ?? ''}`,
    });
    assert.equal((await refreshed.get('/api/auth/me')).status, 200);
    await signIn(app.client, 'editor@test.local', 'another-long-password');
  });

  test('logout clears the session cookie', async () => {
    const admin = await app.signIn('admin@test.local');
    const res = await admin.post('/api/auth/logout');
    assert.equal(res.status, 204);
    assert.ok(res.headers.getSetCookie().some((cookie) => cookie.startsWith('avi_cms_session=;')));
  });
});

describe('login rate limit', () => {
  let limited: TestApp;
  before(async () => {
    await app.close();
    limited = await startTestApp({ AUTH_RATE_LIMIT: 3 });
    app = limited;
  });

  test('answers 429 after too many attempts', async () => {
    const csrf = await limited.client.get('/api/auth/csrf');
    const jar = cookieJar(csrf.headers.getSetCookie());
    const headers = { cookie: cookieHeader(jar), 'x-csrf-token': decodeURIComponent(jar['avi_cms_csrf'] ?? '') };
    const attempt = () =>
      limited.client.post('/api/auth/login', { email: 'admin@test.local', password: 'wrong-password' }, { headers });
    for (let i = 0; i < 3; i++) assert.equal((await attempt()).status, 401);
    const blocked = await attempt();
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get('retry-after'));
  });
});
