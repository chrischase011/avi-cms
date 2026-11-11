/** Image types the library accepts, with the extension files are stored under. */
export const IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
} as const;
export type ImageType = keyof typeof IMAGE_TYPES;
export const ACCEPTED_TYPES = Object.keys(IMAGE_TYPES) as ImageType[];

export const CONTENT_TYPE_BY_EXTENSION: Record<string, ImageType> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

const startsWith = (data: Buffer, bytes: number[], offset = 0) =>
  bytes.every((byte, index) => data[offset + index] === byte);

/**
 * The type the bytes say, regardless of what the client claimed. SVG is deliberately absent:
 * it can carry scripts.
 */
export function detectImageType(data: Buffer): ImageType | undefined {
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(data, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (data.subarray(0, 6).toString('ascii') === 'GIF87a') return 'image/gif';
  if (data.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image/gif';
  if (data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return undefined;
}
