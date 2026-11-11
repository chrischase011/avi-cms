import { z } from 'zod';

const mediaId = z.number().int().positive().nullable();

/** Every setting, with its default. Stored one row per key. */
export const SettingsShape = {
  siteName: z.string().trim().min(1, 'site name is required').max(120).default('Avi CMS'),
  siteDescription: z.string().trim().max(500).default(''),
  siteUrl: z.union([z.string().trim().url('Enter a full URL, e.g. https://example.com').max(255), z.literal('')]).default(''),
  logoId: mediaId.default(null),
  faviconId: mediaId.default(null),
  defaultSeoTitle: z.string().trim().max(200).default(''),
  defaultSeoDescription: z.string().trim().max(320).default(''),
  postsPerPage: z.number().int().min(1).max(100).default(10),
};

export const Settings = z.object(SettingsShape);
export type Settings = z.infer<typeof Settings>;
export type SettingKey = keyof Settings;
export const SETTING_KEYS = Object.keys(SettingsShape) as SettingKey[];

/** PUT body: any subset; unknown keys are dropped. */
export const UpdateSettings = z
  .object({
    siteName: SettingsShape.siteName.removeDefault(),
    siteDescription: SettingsShape.siteDescription.removeDefault(),
    siteUrl: SettingsShape.siteUrl.removeDefault(),
    logoId: mediaId,
    faviconId: mediaId,
    defaultSeoTitle: SettingsShape.defaultSeoTitle.removeDefault(),
    defaultSeoDescription: SettingsShape.defaultSeoDescription.removeDefault(),
    postsPerPage: SettingsShape.postsPerPage.removeDefault(),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'nothing to update');
export type UpdateSettings = z.infer<typeof UpdateSettings>;
