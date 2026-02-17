import { NextResponse } from 'next/server';
import { getServiceById } from '@/lib/data/items';
import { logServerError } from '@/lib/utils/logger';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const item = await getServiceById(id);

    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    logServerError('api.items.id.error', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}
