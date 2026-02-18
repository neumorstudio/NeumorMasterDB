import type { Filters } from '@/types/items';

export function countActiveAdvancedFilters(filters: Filters) {
  let count = 0;
  if (filters.serviceId.trim()) count += 1;
  if (filters.businessId.trim()) count += 1;
  if (filters.serviceName.trim()) count += 1;
  if (filters.businessName.trim()) count += 1;
  if (filters.currencyCode.trim()) count += 1;
  if (filters.phone.trim()) count += 1;
  if (filters.durationExact !== null) count += 1;
  if (filters.priceKinds.length > 0) count += 1;
  if (filters.region.trim()) count += 1;
  if (filters.minDuration !== null) count += 1;
  if (filters.maxDuration !== 240) count += 1;
  return count;
}

export function calculateSearchCreditCost(filters: Filters) {
  const base = 1;
  const advanced = filters.advancedMode ? countActiveAdvancedFilters(filters) : 0;
  return base + advanced;
}
