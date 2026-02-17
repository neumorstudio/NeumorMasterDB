import { describe, expect, it } from 'vitest';
import { parseFilters } from '@/lib/filters/schema';

describe('parseFilters', () => {
  it('normalizes valid input', () => {
    const filters = parseFilters({
      q: 'maquillaje',
      country: 'es',
      businessTypes: 'hair,nails',
      page: '2',
      pageSize: '50',
    });

    expect(filters.q).toBe('maquillaje');
    expect(filters.country).toBe('ES');
    expect(filters.businessTypes).toEqual(['hair', 'nails']);
    expect(filters.page).toBe(2);
    expect(filters.pageSize).toBe(50);
  });

  it('falls back to defaults on invalid payload', () => {
    const filters = parseFilters({ page: '-1', pageSize: '13', sort: 'invalid' });
    expect(filters.page).toBe(1);
    expect(filters.pageSize).toBe(25);
    expect(filters.sort).toBe('relevance');
  });
});
