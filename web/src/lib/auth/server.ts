import { createServerClient } from '@supabase/ssr';
import { cache } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { cookies } from 'next/headers';
import { getServerAuthEnv } from '@/lib/env';
import { logServerError, logServerInfo } from '@/lib/utils/logger';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { supabaseAnonKey, supabaseUrl } = getServerAuthEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from server components where mutating cookies is not always allowed.
        }
      },
    },
  });
}

const shouldDebugAuth = process.env.AUTH_DEBUG === '1';

export const getServerUser = cache(async function getServerUser() {
  noStore();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    logServerError('auth.get_user.failed', error);
    return null;
  }
  if (shouldDebugAuth) {
    logServerInfo('auth.get_user.result', { userId: data.user?.id ?? null });
  }
  return data.user;
});
