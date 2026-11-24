import { type NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { processAndUploadImage } from '@/modules/media/media.service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Rate limit uploads: 50 uploads per hour per user/IP
  const ip = getClientIp(request.headers)
  const rateLimit = await checkRateLimit(`upload:${profile.id || ip}`, 50, 3600)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Upload rate limit exceeded. Please wait before uploading more files.' },
      { status: 429 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = (formData.get('bucket') as any) || 'article-content'
    const altText = (formData.get('altText') as string) || undefined
    const caption = (formData.get('caption') as string) || undefined
    const articleId = (formData.get('articleId') as string) || undefined

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    const result = await processAndUploadImage({
      fileBuffer,
      originalName: file.name,
      bucket,
      uploaderId: profile.id,
      uploaderRole: profile.role,
      articleId,
      altText,
      caption,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Server error during upload' },
      { status: 500 }
    )
  }
}
