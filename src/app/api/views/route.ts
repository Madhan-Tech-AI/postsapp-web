import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { recordArticleView } from '@/modules/views/views.service'

const recordViewSchema = z.object({
  articleId: z.string().uuid(),
  sessionId: z.string().max(100).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = recordViewSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      )
    }

    const { articleId, sessionId } = parsed.data

    // Extract client IP (handle standard proxy headers)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || '127.0.0.1'

    const userAgent = request.headers.get('user-agent') || ''

    const result = await recordArticleView({
      articleId,
      ip,
      userAgent,
      sessionId,
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
