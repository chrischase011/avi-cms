import { Injectable } from '@avijs/core';
import { Config } from '../../config.js';
import type { MediaRow } from '../../database/schema.js';

export interface MediaDto {
  id: number;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  alt: string;
  createdAt: Date;
  uploadedBy: { id: number; name: string } | null;
}

/** Turns media rows into API objects with a public URL. Shared by posts, settings and public. */
@Injectable()
export class MediaPresenter {
  readonly #base: string;

  constructor(config: Config) {
    this.#base = config.PUBLIC_URL.replace(/\/+$/, '');
  }

  url(storageKey: string): string {
    return `${this.#base}/uploads/${storageKey}`;
  }

  present(row: MediaRow, uploader?: { id: number; name: string } | null): MediaDto {
    return {
      id: row.id,
      url: this.url(row.storageKey),
      originalName: row.originalName,
      mimeType: row.mimeType,
      size: row.size,
      alt: row.alt,
      createdAt: row.createdAt,
      uploadedBy: uploader ?? null,
    };
  }
}
