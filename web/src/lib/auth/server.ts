import { createServerClient } from '@supabase/ssr';
import { unstable_noStore as noStore } from 'next/cache';
import { cookies } from 'next/headers';
import { getServerAuthEnv } from '@/lib/env';

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

export async function getServerUser() {
  noStore();
  const supabase = await createSupabaseServerClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    // Fallback only when Auth server validation fails transiently.
    return sessionData.session?.user ?? null;
  }
  return data.user;
}
