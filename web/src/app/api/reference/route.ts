import { NextResponse } from 'next/server';
import { getReferences } from '@/lib/data/items';
import { logServerError } from '@/lib/utils/logger';

export async function GET() {
  try {
    const refs = await getReferences();
    return NextResponse.json(refs);
  } catch (error) {
    logServerError('api.reference.error', error);
    return NextResponse.json({ error: 'Failed to fetch references' }, { status: 500 });
  }
}
