import { getServerEnv } from '@/lib/env';

type FetchOptions = {
  params?: URLSearchParams;
  range?: { from: number; to: number };
  countExact?: boolean;
};

export async function fetchSupabase<T>(path: string, options: FetchOptions = {}): Promise<{ data: T; total: number }> {
  const { supabaseUrl, supabaseKey } = getServerEnv();
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);

  if (options.params) {
    url.search = options.params.toString();
  }

  const headers = new Headers({
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  });

  if (options.countExact) {
    headers.set('Prefer', 'count=exact');
  }

  if (options.range) {
    headers.set('Range-Unit', 'items');
    headers.set('Range', `${options.range.from}-${options.range.to}`);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${body}`);
  }

  const contentRange = response.headers.get('content-range') ?? '';
  const total = parseTotalFromContentRange(contentRange);
  return { data: (await response.json()) as T, total };
}

export function parseTotalFromContentRange(contentRange: string) {
  if (!contentRange.includes('/')) return 0;
  const raw = contentRange.split('/').at(-1);
  const total = Number(raw);
  return Number.isFinite(total) ? total : 0;
}
