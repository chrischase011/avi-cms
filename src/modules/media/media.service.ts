import { HttpError, Injectable } from '@avijs/core';
import { count, desc, eq, ilike } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { likePattern, offsetOf, paginated, type PageQuery } from '../../common/pagination.js';
import { Db } from '../../database/database.module.js';
import { media, users } from '../../database/schema.js';
import type { AuthUser } from '../auth/auth.types.js';
import { canManageContent } from '../auth/auth.guard.js';
import { IMAGE_TYPES, detectImageType } from './file-type.js';
import { MediaPresenter, type MediaDto } from './media.presenter.js';
import { FileStorage } from './storage.js';

export interface Upload {
  filename: string;
  buffer: Buffer;
  alt: string;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly db: Db,
    private readonly storage: FileStorage,
    private readonly presenter: MediaPresenter,
  ) {}

  async list(query: PageQuery) {
    const where = query.search ? ilike(media.originalName, likePattern(query.search)) : undefined;
    const [rows, [total]] = await Promise.all([
      this.db
        .select({ media, uploader: { id: users.id, name: users.name } })
        .from(media)
        .leftJoin(users, eq(users.id, media.uploadedById))
        .where(where)
        .orderBy(desc(media.createdAt), desc(media.id))
        .limit(query.pageSize)
        .offset(offsetOf(query)),
      this.db.select({ value: count() }).from(media).where(where),
    ]);
    const data = rows.map((row) => this.presenter.present(row.media, row.uploader));
    return paginated(data, total?.value ?? 0, query);
  }

  async findOne(id: number): Promise<MediaDto> {
    const [row] = await this.db
      .select({ media, uploader: { id: users.id, name: users.name } })
      .from(media)
      .leftJoin(users, eq(users.id, media.uploadedById))
      .where(eq(media.id, id))
      .limit(1);
    if (!row) throw new HttpError(404, 'Media not found');
    return this.presenter.present(row.media, row.uploader);
  }

  async upload(file: Upload, user: AuthUser): Promise<MediaDto> {
    // The client's claimed type was already filtered by `accept`; trust only the bytes.
    const type = detectImageType(file.buffer);
    if (!type) throw new HttpError(415, 'The file is not a PNG, JPEG, GIF or WebP image');

    const storageKey = `${randomBytes(16).toString('hex')}.${IMAGE_TYPES[type]}`;
    await this.storage.put(storageKey, file.buffer, type);
    try {
      const [row] = await this.db
        .insert(media)
        .values({
          storageKey,
          originalName: file.filename.slice(0, 255) || 'upload',
          mimeType: type,
          size: file.buffer.length,
          alt: file.alt,
          uploadedById: user.id,
        })
        .returning();
      if (!row) throw new Error('Insert returned no row');
      return this.presenter.present(row, { id: user.id, name: user.name });
    } catch (error) {
      await this.storage.remove(storageKey);
      throw error;
    }
  }

  async updateAlt(id: number, alt: string, user: AuthUser): Promise<MediaDto> {
    await this.#ownedBy(id, user);
    await this.db.update(media).set({ alt }).where(eq(media.id, id));
    return this.findOne(id);
  }

  /** Posts using the file as featured image keep working; the reference is cleared. */
  async remove(id: number, user: AuthUser): Promise<void> {
    const row = await this.#ownedBy(id, user);
    await this.db.delete(media).where(eq(media.id, id));
    await this.storage.remove(row.storageKey);
  }

  async #ownedBy(id: number, user: AuthUser) {
    const [row] = await this.db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!row) throw new HttpError(404, 'Media not found');
    if (!canManageContent(user.role) && row.uploadedById !== user.id) {
      throw new HttpError(403, 'You can only change files you uploaded');
    }
    return row;
  }
}
