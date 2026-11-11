import { Controller, Get, HttpError, reply, type Context } from '@avijs/core';
import { CONTENT_TYPE_BY_EXTENSION } from './file-type.js';
import { FileStorage, STORAGE_KEY } from './storage.js';

/** Serves uploaded files. Public, since published posts link to them. */
@Controller('/uploads')
export class UploadsController {
  constructor(private readonly storage: FileStorage) {}

  @Get('/:key')
  async file(ctx: Context) {
    const key = ctx.params['key'] ?? '';
    // Only names the media service generates; never a path from the request.
    if (!STORAGE_KEY.test(key)) throw new HttpError(404);
    const file = await this.storage.open(key);
    if (!file) throw new HttpError(404);
    const extension = key.slice(key.lastIndexOf('.') + 1);
    return reply(file.stream, {
      headers: {
        'content-type': CONTENT_TYPE_BY_EXTENSION[extension] ?? 'application/octet-stream',
        'content-length': String(file.size),
        // Keys are random and never reused, so the file can be cached forever.
        'cache-control': 'public, max-age=31536000, immutable',
        'content-security-policy': "default-src 'none'; sandbox",
        // Other sites that consume the public API may embed these images.
        'cross-origin-resource-policy': 'cross-origin',
      },
    });
  }
}
