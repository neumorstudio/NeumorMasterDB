import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getPublicSupabaseEnv } from '@/lib/env';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const otpType = url.searchParams.get('type');
  const next = url.searchParams.get('next') || '/items';
  const redirectResponse = NextResponse.redirect(new URL(next, url.origin));

  const { supabaseAnonKey, supabaseUrl } = getPublicSupabaseEnv();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
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
  } else if (tokenHash && otpType) {
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as 'magiclink' | 'recovery' | 'invite' | 'email' | 'email_change',
    });
  }

  return redirectResponse;
}
