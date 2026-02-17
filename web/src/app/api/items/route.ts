import { NextResponse } from 'next/server';
import { listItems } from '@/lib/data/items';
import { parseFilters } from '@/lib/filters/schema';
import { logServerError, logServerInfo } from '@/lib/utils/logger';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseFilters(Object.fromEntries(url.searchParams.entries()));
    const result = await listItems(filters);
    logServerInfo('api.items.success', { page: result.page, total: result.total, scope: filters.scope });
    return NextResponse.json(result);
  } catch (error) {
    logServerError('api.items.error', error);
    return NextResponse.json({ error: 'Failed to list items' }, { status: 500 });
  }
}
