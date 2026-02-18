import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/auth/admin';
import { logServerError } from '@/lib/utils/logger';

const bodySchema = z.object({
  email: z.string().trim().email(),
  next: z.string().trim().optional(),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { email, next } = parsed.data;
    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next || '/items')}`;
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const properties = (data as {
      properties?: { action_link?: string; hashed_token?: string; email_otp?: string };
    } | null)?.properties;
    const actionLink = properties?.action_link || null;
    const tokenHash = properties?.hashed_token || null;
    const localActionLink = tokenHash
      ? `${origin}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent(next || '/items')}`
      : null;

    return NextResponse.json({
      ok: true,
      email,
      redirectTo,
      action_link: actionLink,
      local_action_link: localActionLink,
      token_hash: tokenHash,
      note: 'Dev-only endpoint. Open action_link in browser to sign in.',
    });
  } catch (error) {
    logServerError('api.dev.auth.magic_link.error', error);
    return NextResponse.json({ error: 'Failed to generate magic link' }, { status: 500 });
  }
}
