import { Controller, Get, HttpError, reply, type Context } from '@avijs/core';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Config } from '../config.js';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/**
 * Serves the built admin UI (web/dist) when SERVE_WEB=true, with an index.html fallback so a
 * refresh on /posts/12/edit loads the app and React Router takes over. Static API routes always
 * win over this catch-all, since Avi.js prefers static segments.
 */
@Controller()
export class WebController {
  readonly #root = path.resolve('web', 'dist');

  constructor(private readonly config: Config) {}

  @Get('/*')
  async serve(ctx: Context) {
    const requested = ctx.params['*'] ?? '';
    if (!this.config.SERVE_WEB || /^(api|uploads)(\/|$)/.test(requested)) throw new HttpError(404);

    const file = path.resolve(this.#root, requested);
    // `*` passes `..` through literally; never leave the build folder.
    const inside = file === this.#root || file.startsWith(this.#root + path.sep);
    const target = inside && (await isFile(file)) ? file : path.join(this.#root, 'index.html');
    if (!(await isFile(target))) throw new HttpError(404, 'The admin UI is not built. Run npm run build.');

    const isIndex = target.endsWith('index.html');
    return reply(createReadStream(target), {
      headers: {
        'content-type': TYPES[path.extname(target)] ?? 'application/octet-stream',
        'cache-control': isIndex ? 'no-cache' : 'public, max-age=31536000, immutable',
        'content-security-policy': CSP,
      },
    });
  }
}

async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}
