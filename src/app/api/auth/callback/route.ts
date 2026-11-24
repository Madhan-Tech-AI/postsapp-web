import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { sanitizeRedirectUrl } from '@/lib/utils'

/**
 * Auth Callback Route Handler
 *
 * Handles email verification links, password reset links, and magic links.
 * Exchanges the auth code for a session cookie and redirects safely.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = request.cookies
    let response = NextResponse.redirect(new URL(sanitizeRedirectUrl(next, '/'), origin))

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
              })
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
  }

  // Auth code exchange error -> redirect to login with error
  return NextResponse.redirect(
    new URL('/en/auth/login?error=Invalid+or+expired+link', origin)
  )
}
