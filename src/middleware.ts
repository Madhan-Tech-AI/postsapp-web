import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Protected admin paths — require authentication + editorial role
const ADMIN_PATHS = ['/admin']
// Paths exempt from admin checks (login page)
const ADMIN_PUBLIC_PATHS = ['/admin/login', '/admin/reset-password']

// Language codes for routing
const SUPPORTED_LANGUAGES = ['en', 'ta'] as const

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ----------------------------------------------------------------
  // 1. Create a response that will carry updated session cookies
  // ----------------------------------------------------------------
  let response = NextResponse.next({
    request,
  })

  // ----------------------------------------------------------------
  // 2. Refresh the Supabase session (keeps tokens alive)
  // ----------------------------------------------------------------
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
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

  // getUser() performs server-side session verification
  const { data: { user } } = await supabase.auth.getUser()

  // ----------------------------------------------------------------
  // 2.5. Redirect accidental locale-prefixed admin routes: /en/admin/... -> /admin/...
  // ----------------------------------------------------------------
  if (pathname.startsWith('/en/admin') || pathname.startsWith('/ta/admin')) {
    const cleanPath = pathname.replace(/^\/(en|ta)/, '')
    return NextResponse.redirect(new URL(cleanPath, request.url))
  }

  // ----------------------------------------------------------------
  // 3. Root redirect — send '/' to language-prefixed home
  // ----------------------------------------------------------------
  if (pathname === '/') {
    // Try to detect preferred language from cookie, then Accept-Language
    const preferredLang = request.cookies.get('preferred_language')?.value
    const acceptLang = request.headers.get('accept-language')
    let lang: string = 'en'

    if (preferredLang && SUPPORTED_LANGUAGES.includes(preferredLang as typeof SUPPORTED_LANGUAGES[number])) {
      lang = preferredLang
    } else if (acceptLang?.includes('ta')) {
      lang = 'ta'
    }

    return NextResponse.redirect(new URL(`/${lang}`, request.url))
  }

  // ----------------------------------------------------------------
  // 4. Admin route protection (server-side — not client-side check)
  // ----------------------------------------------------------------
  const isAdminPath = pathname.startsWith('/admin')
  const isAdminPublicPath = ADMIN_PUBLIC_PATHS.some(p => pathname.startsWith(p))

  if (isAdminPath && !isAdminPublicPath) {
    if (!user) {
      // Not logged in — redirect to admin login
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Verify role from database (server-side — not from JWT claims)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    const hasEditorialAccess = profile?.is_active &&
      ['author', 'editor', 'super_admin'].includes(profile?.role ?? '')

    if (!hasEditorialAccess) {
      // Logged in but not editorial — redirect to home
      return NextResponse.redirect(new URL('/en', request.url))
    }
  }

  // ----------------------------------------------------------------
  // 5. Redirect /admin/login for already-authenticated editorial users
  // ----------------------------------------------------------------
  if (pathname === '/admin/login' && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profile?.is_active && ['author', 'editor', 'super_admin'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // ----------------------------------------------------------------
  // 6. Open-redirect protection: validate 'next' parameter
  // ----------------------------------------------------------------
  const nextParam = request.nextUrl.searchParams.get('next')
  if (nextParam && !nextParam.startsWith('/')) {
    // Reject absolute URLs to prevent open redirect
    const sanitized = new URL(request.url)
    sanitized.searchParams.delete('next')
    return NextResponse.redirect(sanitized)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Run on all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Public assets
     * - API routes that handle their own auth
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
