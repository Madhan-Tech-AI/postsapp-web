/**
 * Media Domain Service
 *
 * Implements Section 7.6:
 * - Magic byte inspection (rejects disguised files)
 * - EXIF stripping (GPS / camera data removed) via sharp
 * - WebP compression and optimization
 * - Server-generated random UUID paths (no user filenames in paths)
 * - Storage bucket folder ownership checking
 * - Media library queries and audit-logged deletions
 */
import 'server-only'

import sharp from 'sharp'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { detectImageMagicBytes } from './magic-bytes'
import { BUCKETS, UPLOAD_LIMITS } from '@/lib/constants'
import type { UserRole, MediaType } from '@/lib/schemas'

export interface UploadImageInput {
  fileBuffer: Buffer
  originalName: string
  bucket: 'article-featured' | 'article-content' | 'author-avatars' | 'editorial-temp'
  uploaderId: string
  uploaderRole: UserRole
  articleId?: string
  altText?: string
  caption?: string
}

export interface UploadResult {
  success: boolean
  mediaId?: string
  storagePath?: string
  publicUrl?: string
  width?: number
  height?: number
  error?: string
}

/**
 * Process and securely upload an image.
 */
export async function processAndUploadImage(input: UploadImageInput): Promise<UploadResult> {
  const { fileBuffer, bucket, uploaderId, uploaderRole, articleId, altText, caption } = input

  // 1. Enforce size limits
  const maxBytes =
    bucket === 'author-avatars' ? UPLOAD_LIMITS.MAX_AVATAR_BYTES : UPLOAD_LIMITS.MAX_IMAGE_BYTES

  if (fileBuffer.length > maxBytes) {
    return {
      success: false,
      error: `File exceeds maximum allowed size of ${Math.round(maxBytes / (1024 * 1024))} MB`,
    }
  }

  // 2. Validate magic bytes (not trusting file extension or client MIME)
  const detectedMime = detectImageMagicBytes(fileBuffer)
  if (!detectedMime) {
    return {
      success: false,
      error: 'Invalid or unsupported image file. Only genuine JPEG, PNG, and WebP images are allowed.',
    }
  }

  // 3. Authorization check per bucket
  if (bucket === 'article-featured' || bucket === 'article-content' || bucket === 'editorial-temp') {
    if (!['author', 'editor', 'super_admin'].includes(uploaderRole)) {
      return { success: false, error: 'Unauthorized: Editorial role required to upload article media' }
    }
  }

  try {
    // 4. Process image with sharp:
    // - Strip all EXIF / GPS metadata (.rotate() auto-orients then discards EXIF)
    // - Convert to WebP for modern performance & compression
    let sharpInstance = sharp(fileBuffer).rotate() // Auto-orient before stripping EXIF

    if (bucket === 'author-avatars') {
      // Resize avatars to a neat square
      sharpInstance = sharpInstance.resize(400, 400, { fit: 'cover' })
    } else {
      // Cap maximum dimensions for web delivery
      sharpInstance = sharpInstance.resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
    }

    const processedBuffer = await sharpInstance.webp({ quality: 85 }).toBuffer()
    const metadata = await sharp(processedBuffer).metadata()

    // 5. Generate secure random storage path: {uploaderId}/{randomUUID}.webp
    // Section 7.6: User-supplied filenames are NEVER used as storage paths
    const randomFileName = `${crypto.randomUUID()}.webp`
    const storagePath = `${uploaderId}/${randomFileName}`

    const adminClient = createSupabaseAdminClient()

    // 6. Upload to Supabase Storage
    const { error: storageError } = await adminClient.storage
      .from(bucket)
      .upload(storagePath, processedBuffer, {
        contentType: 'image/webp',
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      })

    if (storageError) {
      return { success: false, error: `Storage upload failed: ${storageError.message}` }
    }

    // 7. Insert record into article_media
    const { data: mediaRow, error: dbError } = await adminClient
      .from('article_media')
      .insert({
        article_id: articleId || null,
        uploader_id: uploaderId,
        media_type: 'image',
        storage_path: `${bucket}/${storagePath}`,
        mime_type: 'image/webp',
        file_size_bytes: processedBuffer.length,
        alt_text: altText || null,
        caption: caption || null,
        width: metadata.width || null,
        height: metadata.height || null,
      })
      .select('id')
      .single()

    if (dbError) {
      // Clean up uploaded file on DB insert failure
      await adminClient.storage.from(bucket).remove([storagePath])
      return { success: false, error: 'Database indexing failed' }
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`

    return {
      success: true,
      mediaId: mediaRow?.id,
      storagePath: `${bucket}/${storagePath}`,
      publicUrl,
      width: metadata.width,
      height: metadata.height,
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Image processing failed' }
  }
}

/**
 * Fetch media items for the media library.
 * Scoped by role (Authors see own; Editor/SuperAdmin see all).
 */
export async function getMediaLibraryItems(options: {
  role: UserRole
  currentUserId: string
  page?: number
  limit?: number
}) {
  const adminClient = createSupabaseAdminClient()
  const page = options.page || 1
  const limit = options.limit || 30
  const offset = (page - 1) * limit

  let query = adminClient
    .from('article_media')
    .select(
      `
      id,
      article_id,
      uploader_id,
      media_type,
      storage_path,
      mime_type,
      file_size_bytes,
      alt_text,
      caption,
      width,
      height,
      created_at,
      profiles:uploader_id (display_name)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Authors can only see their own uploads
  if (options.role === 'author') {
    query = query.eq('uploader_id', options.currentUserId)
  }

  const { data, count, error } = await query

  return {
    items: data || [],
    totalCount: count || 0,
    error: error?.message,
  }
}

/**
 * Delete a media item:
 * - Verifies ownership (Authors can only delete own; Editor/SuperAdmin can delete any)
 * - Deletes from Supabase storage bucket
 * - Deletes from article_media table
 * - Writes audit log
 */
export async function deleteMediaItem(
  mediaId: string,
  actorId: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createSupabaseAdminClient()

  // 1. Fetch media record
  const { data: media } = await adminClient
    .from('article_media')
    .select('id, uploader_id, storage_path, media_type')
    .eq('id', mediaId)
    .single()

  if (!media) return { success: false, error: 'Media not found' }

  // Ownership check
  if (role === 'author' && media.uploader_id !== actorId) {
    return { success: false, error: 'Permission denied: You can only delete your own uploads' }
  }

  // 2. Remove from Supabase Storage if storage_path exists
  if (media.storage_path) {
    const parts = media.storage_path.split('/')
    const bucket = parts[0]
    const filePath = parts.slice(1).join('/')
    await adminClient.storage.from(bucket).remove([filePath])
  }

  // 3. Delete from article_media
  const { error: deleteError } = await adminClient
    .from('article_media')
    .delete()
    .eq('id', mediaId)

  if (deleteError) return { success: false, error: deleteError.message }

  // 4. Write audit log
  await adminClient.from('audit_logs').insert({
    actor_id: actorId,
    action: 'media_delete',
    target_type: 'media',
    target_id: mediaId,
    metadata: { storage_path: media.storage_path },
  })

  return { success: true }
}
