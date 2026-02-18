import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerAuthEnv } from '@/lib/env';
import { logServerError, logServerInfo } from '@/lib/utils/logger';

const shouldDebugAuth = process.env.AUTH_DEBUG === '1';

export async function middleware(request: NextRequest) {
  const canonicalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NODE_ENV === 'production' && canonicalAppUrl) {
    const canonicalUrl = new URL(canonicalAppUrl);
    const isDifferentHost = request.nextUrl.host !== canonicalUrl.host;
    const isVercelPreviewHost = request.nextUrl.hostname.endsWith('.vercel.app');
    if (isDifferentHost && isVercelPreviewHost) {
      const redirectUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, canonicalUrl);
      return NextResponse.redirect(redirectUrl, 307);
    }
  }

  let response = NextResponse.next({ request });
  let supabaseUrl = '';
  let supabaseAnonKey = '';
  try {
    const env = getServerAuthEnv();
    supabaseUrl = env.supabaseUrl;
    supabaseAnonKey = env.supabaseAnonKey;
  } catch {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    logServerError('auth.middleware.get_user.failed', error, {
      path: request.nextUrl.pathname,
      hasSbCookie: request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-')),
    });
  } else if (shouldDebugAuth) {
    logServerInfo('auth.middleware.get_user.ok', {
      path: request.nextUrl.pathname,
      userId: data.user?.id ?? null,
      hasSbCookie: request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-')),
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
