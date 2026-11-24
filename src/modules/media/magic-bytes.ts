/**
 * Magic Bytes Detector
 *
 * Implements Section 7.6:
 * Validates real binary headers (magic bytes) to prevent extension spoofing
 * (e.g. executable/PHP/HTML files renamed to .jpg or .png).
 */

export type DetectedMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | null

/**
 * Detect file MIME type from raw buffer magic bytes
 */
export function detectImageMagicBytes(buffer: Buffer): DetectedMimeType {
  if (!buffer || buffer.length < 12) {
    return null
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png'
  }

  // 3. WebP: RIFF (bytes 0-3: 52 49 46 46) ... WEBP (bytes 8-11: 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp'
  }

  return null
}
