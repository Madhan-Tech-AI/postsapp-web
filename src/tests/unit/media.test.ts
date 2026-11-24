import { describe, it, expect } from 'vitest'
import { detectImageMagicBytes } from '@/modules/media/magic-bytes'
import { storagePathSchema } from '@/lib/schemas'

describe('Media Security — Magic Bytes & Path Traversal (PRD §7.6)', () => {
  describe('detectImageMagicBytes', () => {
    it('detects genuine JPEG magic bytes (FF D8 FF)', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
      expect(detectImageMagicBytes(jpegBuffer)).toBe('image/jpeg')
    })

    it('detects genuine PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)', () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ])
      expect(detectImageMagicBytes(pngBuffer)).toBe('image/png')
    })

    it('detects genuine WebP magic bytes (RIFF...WEBP)', () => {
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x24, 0x00, 0x00, 0x00, // Size
        0x57, 0x45, 0x42, 0x50, // WEBP
      ])
      expect(detectImageMagicBytes(webpBuffer)).toBe('image/webp')
    })

    it('rejects PHP scripts disguised as images (extension spoofing attack)', () => {
      const fakeJpg = Buffer.from('<?php echo system($_GET["cmd"]); ?>')
      expect(detectImageMagicBytes(fakeJpg)).toBeNull()
    })

    it('rejects HTML/SVG scripts disguised as images', () => {
      const fakePng = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>')
      expect(detectImageMagicBytes(fakePng)).toBeNull()
    })

    it('rejects truncated or empty buffers', () => {
      expect(detectImageMagicBytes(Buffer.alloc(0))).toBeNull()
      expect(detectImageMagicBytes(Buffer.from([0xff, 0xd8]))).toBeNull() // truncated
    })
  })

  describe('Storage Path Safety (Path Traversal Protection)', () => {
    it('accepts clean server-generated relative storage paths', () => {
      expect(storagePathSchema.safeParse('article-featured/user-id/random-uuid.webp').success).toBe(true)
      expect(storagePathSchema.safeParse('article-content/a1b2c3/image.jpg').success).toBe(true)
    })

    it('rejects directory traversal attempts', () => {
      expect(storagePathSchema.safeParse('../../../etc/passwd').success).toBe(false)
      expect(storagePathSchema.safeParse('article-content/../../secrets.env').success).toBe(false)
      expect(storagePathSchema.safeParse('..\\..\\windows\\system32').success).toBe(false)
    })

    it('rejects command injection characters in paths', () => {
      expect(storagePathSchema.safeParse('path; rm -rf /').success).toBe(false)
      expect(storagePathSchema.safeParse('article/cover|whoami').success).toBe(false)
      expect(storagePathSchema.safeParse('article/cover`cat /etc/passwd`').success).toBe(false)
    })
  })
})
