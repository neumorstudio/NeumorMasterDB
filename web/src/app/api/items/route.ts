import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { calculateSearchCreditCost } from '@/lib/credits/cost';
import { buildQueryFingerprint, consumeUserSearchCredit, getUserCreditStatus } from '@/lib/credits/user';
import { listItems } from '@/lib/data/items';
import { parseFilters } from '@/lib/filters/schema';
import { logServerError, logServerInfo } from '@/lib/utils/logger';
import type { Filters } from '@/types/items';

export async function GET(request: Request) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const filters = parseFilters(Object.fromEntries(url.searchParams.entries()));
    const shouldCharge = (hasActiveFilters(filters) || filters.showAll) && filters.page === 1;
    const searchCreditCost = calculateSearchCreditCost(filters);
    let credits = await getUserCreditStatus(user.id);

    if (shouldCharge) {
      credits = await consumeUserSearchCredit({
        userId: user.id,
        cost: searchCreditCost,
        endpoint: 'items_api',
        queryFingerprint: buildQueryFingerprint(JSON.stringify({ ...filters, page: 1 })),
      });
      if (!credits.ok) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            message: credits.message ?? 'No hay creditos disponibles',
            credits,
          },
          { status: 402 },
        );
      }
    }

    const result = await listItems(filters);
    logServerInfo('api.items.success', { page: result.page, total: result.total, scope: filters.scope });
    return NextResponse.json({ ...result, credits });
  } catch (error) {
    logServerError('api.items.error', error);
    return NextResponse.json({ error: 'Failed to list items' }, { status: 500 });
  }
}

function hasActiveFilters(filters: Filters) {
  return Boolean(
    filters.q.trim() ||
      filters.serviceId.trim() ||
      filters.businessId.trim() ||
      filters.serviceName.trim() ||
      filters.businessName.trim() ||
      filters.currencyCode.trim() ||
      filters.phone.trim() ||
      filters.durationExact !== null ||
      filters.city.trim() ||
      filters.region.trim() ||
      filters.country !== 'ES' ||
      filters.businessTypes.length > 0 ||
      filters.categories.length > 0 ||
      filters.priceKinds.length > 0 ||
      filters.minPrice !== null ||
      filters.maxPrice !== 250 ||
      filters.minDuration !== null ||
      filters.maxDuration !== 240
  );
}
