import { NextResponse } from 'next/server';
import { getBusinessDetail } from '@/lib/data/items';
import { logServerError } from '@/lib/utils/logger';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const detail = await getBusinessDetail(id);

    if (!detail) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    logServerError('api.businesses.id.error', error);
    return NextResponse.json({ error: 'Failed to fetch business detail' }, { status: 500 });
  }
}
