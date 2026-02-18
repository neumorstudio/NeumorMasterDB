import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { getUserCreditStatus } from '@/lib/credits/user';
import { logServerError } from '@/lib/utils/logger';

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const credits = await getUserCreditStatus(user.id);
    return NextResponse.json(credits);
  } catch (error) {
    logServerError('api.credits.error', error);
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
  }
}
