import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url));
}

export async function GET(request: Request) {
  // GET can be prefetched by the client/router. Never sign out on GET.
  return NextResponse.redirect(new URL('/items', request.url));
}
