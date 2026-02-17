import { describe, expect, it } from 'vitest';
import { parseTotalFromContentRange } from '@/lib/data/supabase';
import { sortOrder } from '@/lib/data/items';

describe('supabase helpers', () => {
  it('parses total from content-range', () => {
    expect(parseTotalFromContentRange('0-24/315')).toBe(315);
    expect(parseTotalFromContentRange('')).toBe(0);
  });

  it('returns sort order for key', () => {
    expect(sortOrder('price_asc')).toContain('price_cents.asc');
    expect(sortOrder('relevance')).toContain('business_name.asc');
  });
});
