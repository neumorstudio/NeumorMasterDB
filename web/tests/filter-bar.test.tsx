import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterBar } from '@/components/items/FilterBar';
import type { Filters } from '@/types/items';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/items',
  useSearchParams: () => new URLSearchParams(''),
}));

const baseFilters: Filters = {
  q: '',
  showAll: false,
  advancedMode: false,
  serviceId: '',
  businessId: '',
  serviceName: '',
  businessName: '',
  currencyCode: '',
  phone: '',
  durationExact: null,
  country: 'ES',
  city: '',
  region: '',
  businessTypes: [],
  categories: [],
  priceKinds: [],
  minPrice: null,
  maxPrice: 250,
  minDuration: null,
  maxDuration: 240,
  sort: 'relevance',
  page: 1,
  pageSize: 25,
  view: 'cards',
  scope: 'businesses',
};

describe('FilterBar', () => {
  it('debounces search and pushes URL params', async () => {
    render(<FilterBar filters={baseFilters} businessTypes={[]} categories={[]} />);
    await userEvent.type(screen.getByLabelText('Buscar'), 'spa');

    await waitFor(
      () => {
        expect(pushMock).toHaveBeenCalled();
        const last = pushMock.mock.calls.at(-1)?.[0] as string;
        expect(last).toContain('/items?');
        expect(last).toContain('q=spa');
      },
      { timeout: 1000 },
    );
  });
});
