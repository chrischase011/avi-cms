import { HttpError, Injectable } from '@avijs/core';
import { eq, inArray } from 'drizzle-orm';
import { Db } from '../../database/database.module.js';
import { media, settings } from '../../database/schema.js';
import { MediaPresenter } from '../media/media.presenter.js';
import { SETTING_KEYS, SettingsShape, type Settings, type UpdateSettings } from './settings.schemas.js';

export interface SettingsDto extends Settings {
  logoUrl: string | null;
  faviconUrl: string | null;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly db: Db,
    private readonly media: MediaPresenter,
  ) {}

  async get(): Promise<SettingsDto> {
    const rows = await this.db.select().from(settings).where(inArray(settings.key, SETTING_KEYS));
    const stored = new Map(rows.map((row) => [row.key, row.value]));
    const values = Object.fromEntries(
      SETTING_KEYS.map((key) => {
        // A value that no longer fits its schema (after an upgrade, say) falls back to the default.
        const schema = SettingsShape[key];
        const parsed = schema.safeParse(stored.get(key));
        return [key, parsed.success ? parsed.data : schema.parse(undefined)];
      }),
    ) as Settings;
    return { ...values, ...(await this.#mediaUrls(values)) };
  }

  async update(input: UpdateSettings): Promise<SettingsDto> {
    const ids = [input.logoId, input.faviconId].filter((id): id is number => typeof id === 'number');
    if (ids.length > 0) {
      const found = await this.db.select({ id: media.id }).from(media).where(inArray(media.id, ids));
      if (found.length !== new Set(ids).size) throw new HttpError(400, 'The selected image does not exist');
    }
    const entries = Object.entries(input).filter(([, value]) => value !== undefined);
    await this.db.transaction(async (tx) => {
      for (const [key, value] of entries) {
        // A null (no logo, no favicon) is the default, so the row goes. Drizzle would write SQL
        // NULL rather than JSON null into the NOT NULL value column.
        if (value === null) {
          await tx.delete(settings).where(eq(settings.key, key));
          continue;
        }
        await tx
          .insert(settings)
          .values({ key, value })
          .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
      }
    });
    return this.get();
  }

  async #mediaUrls(values: Settings) {
    const ids = [values.logoId, values.faviconId].filter((id): id is number => id !== null);
    const rows = ids.length > 0 ? await this.db.select().from(media).where(inArray(media.id, ids)) : [];
    const url = (id: number | null) => {
      const row = rows.find((candidate) => candidate.id === id);
      return row ? this.media.url(row.storageKey) : null;
    };
    return { logoUrl: url(values.logoId), faviconUrl: url(values.faviconId) };
  }
}
