import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getPublicSupabaseEnv } from '@/lib/env';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/items';
  const redirectResponse = NextResponse.redirect(new URL(next, url.origin));

  const { supabaseAnonKey, supabaseUrl } = getPublicSupabaseEnv();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get('cookie') || '';
        return cookieHeader
          .split(';')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => {
            const [name, ...rest] = item.split('=');
            return { name, value: rest.join('=') };
          });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return redirectResponse;
}
