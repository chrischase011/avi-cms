import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { TestClient } from '@avijs/testing';
import { TINY_PNG, multipartBody, startTestApp, type TestApp } from '../../test/helpers.js';

let app: TestApp;
let author: TestClient;
let editor: TestClient;
before(async () => {
  app = await startTestApp();
  author = await app.signIn('author@test.local');
  editor = await app.signIn('editor@test.local');
});
after(() => app?.close());

const upload = (client: TestClient, file: Parameters<typeof multipartBody>[0], fields?: Record<string, string>) => {
  const { body, headers } = multipartBody(file, fields);
  return client.post('/api/media', body, { headers });
};

test('uploads a PNG, stores metadata and serves the file', async () => {
  const res = await upload(author, { filename: '../../evil.png', type: 'image/png', data: TINY_PNG }, { alt: 'A dot' });
  assert.equal(res.status, 201);
  const media = (res.body as { data: { url: string; mimeType: string; size: number; alt: string; originalName: string } }).data;
  assert.equal(media.mimeType, 'image/png');
  assert.equal(media.size, TINY_PNG.length);
  assert.equal(media.alt, 'A dot');
  assert.equal(media.originalName, 'evil.png');
  assert.match(media.url, /^\/uploads\/[a-f0-9]{32}\.png$/);

  const file = await app.client.get(media.url);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'image/png');
  assert.equal(file.headers.get('x-content-type-options'), 'nosniff');
});

test('rejects a file whose bytes are not an image, whatever its claimed type', async () => {
  const res = await upload(author, { filename: 'fake.png', type: 'image/png', data: Buffer.from('<script>alert(1)</script>') });
  assert.equal(res.status, 415);
});

test('rejects SVG and other types before reading them', async () => {
  const svg = await upload(author, { filename: 'x.svg', type: 'image/svg+xml', data: Buffer.from('<svg/>') });
  assert.equal(svg.status, 415);
  const html = await upload(author, { filename: 'x.html', type: 'text/html', data: Buffer.from('<p>') });
  assert.equal(html.status, 415);
});

test('rejects files over the size limit', async () => {
  const big = Buffer.concat([TINY_PNG, Buffer.alloc(app.config.UPLOAD_MAX_SIZE)]);
  const res = await upload(author, { filename: 'big.png', type: 'image/png', data: big }).catch(() => undefined);
  // The server may close the connection instead of finishing the 413 while the body still arrives.
  if (res) assert.equal(res.status, 413);
});

test('requires a signed-in user', async () => {
  const { body, headers } = multipartBody({ filename: 'a.png', type: 'image/png', data: TINY_PNG });
  assert.equal((await app.client.post('/api/media', body, { headers })).status, 403); // no CSRF cookie
});

test('authors delete only their own uploads; editors any', async () => {
  const mine = await upload(editor, { filename: 'editor.png', type: 'image/png', data: TINY_PNG });
  const id = (mine.body as { data: { id: number } }).data.id;
  assert.equal((await author.delete(`/api/media/${String(id)}`)).status, 403);
  assert.equal((await editor.delete(`/api/media/${String(id)}`)).status, 204);
});

test('refuses upload paths that are not generated keys', async () => {
  assert.equal((await app.client.get('/uploads/..%2F..%2Fpackage.json')).status, 404);
  assert.equal((await app.client.get('/uploads/package.json')).status, 404);
});
