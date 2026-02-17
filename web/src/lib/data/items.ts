import { SORT_OPTIONS } from '@/lib/filters/constants';
import { fetchSupabase } from '@/lib/data/supabase';
import { logServerError } from '@/lib/utils/logger';
import type { BusinessCard, Filters, PagedResult, References, ServiceItem } from '@/types/items';

const SELECT_FIELDS_FULL =
  'service_id,business_id,business_name,business_type_code,business_type_label,country_code,region,city,service_name,service_category_code,service_category_label,price_kind,currency_code,price_cents,price_min_cents,price_max_cents,duration_minutes';

const SELECT_FIELDS_BUSINESS_LIGHT =
  'business_id,business_name,business_type_label,country_code,region,city,service_name,service_category_code,service_category_label,price_kind,currency_code,price_cents,price_min_cents,price_max_cents,duration_minutes';

export async function getReferences(): Promise<References> {
  const [businessTypes, serviceCategories] = await Promise.all([
    fetchSupabase<Array<{ code: string; label: string }>>('business_types', {
      params: new URLSearchParams({ select: 'code,label', order: 'label.asc' }),
    }),
    fetchSupabase<Array<{ code: string; label: string }>>('service_categories', {
      params: new URLSearchParams({ select: 'code,label', order: 'label.asc' }),
    }),
  ]);

  return {
    businessTypes: businessTypes.data,
    serviceCategories: serviceCategories.data,
  };
}

export async function listItems(filters: Filters): Promise<PagedResult> {
  try {
    if (filters.view === 'cards' && filters.scope === 'businesses') {
      return listBusinessCards(filters);
    }

    const params = buildServiceQuery(filters, SELECT_FIELDS_FULL);
    const from = Math.max(0, (filters.page - 1) * filters.pageSize);
    const to = from + filters.pageSize - 1;

    const result = await fetchSupabase<ServiceItem[]>('v_service_search', {
      params,
      countExact: true,
      range: { from, to },
    });

    const totalPages = Math.max(1, Math.ceil(result.total / filters.pageSize));

    return {
      total: result.total,
      totalPages,
      page: filters.page,
      pageSize: filters.pageSize,
      services: result.data,
      businesses: [],
    };
  } catch (error) {
    logServerError('listItems failed', error, { scope: filters.scope, view: filters.view });
    throw error;
  }
}

export async function getServiceById(serviceId: string): Promise<ServiceItem | null> {
  const params = new URLSearchParams({
    select: SELECT_FIELDS_FULL,
    service_id: `eq.${serviceId}`,
    limit: '1',
  });

  const result = await fetchSupabase<ServiceItem[]>('v_service_search', { params });
  return result.data[0] ?? null;
}

export async function getBusinessDetail(businessId: string) {
  const params = new URLSearchParams({
    select: SELECT_FIELDS_FULL,
    business_id: `eq.${cleanToken(businessId)}`,
    order: 'service_name.asc',
  });

  const services = await fetchAllRows(params);
  if (services.length === 0) return null;

  const business = buildBusinessCards(services)[0];
  const first = services[0];

  return {
    business: {
      business_id: business.business_id,
      business_name: business.business_name,
      business_type_label: business.business_type_label,
      business_type_code: first.business_type_code,
      country_code: first.country_code,
      region: first.region,
      city: first.city,
      service_count: business.service_count,
      categories: business.categories,
      min_price_cents: business.min_price_cents,
      max_price_cents: business.max_price_cents,
    },
    services,
  };
}

async function listBusinessCards(filters: Filters): Promise<PagedResult> {
  const params = buildServiceQuery(filters, SELECT_FIELDS_BUSINESS_LIGHT);
  const rows = await fetchAllRows(params);
  const cards = buildBusinessCards(rows);

  const total = cards.length;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const from = Math.max(0, (filters.page - 1) * filters.pageSize);
  const to = from + filters.pageSize;

  return {
    total,
    totalPages,
    page: filters.page,
    pageSize: filters.pageSize,
    services: [],
    businesses: cards.slice(from, to),
  };
}

async function fetchAllRows(params: URLSearchParams): Promise<ServiceItem[]> {
  const chunkSize = 1000;
  const allRows: ServiceItem[] = [];
  let page = 1;

  for (;;) {
    const from = Math.max(0, (page - 1) * chunkSize);
    const to = from + chunkSize - 1;
    const result = await fetchSupabase<ServiceItem[]>('v_service_search', {
      params,
      countExact: true,
      range: { from, to },
    });

    if (result.data.length === 0) break;
    allRows.push(...result.data);
    if (allRows.length >= result.total || result.data.length < chunkSize) break;
    page += 1;
  }

  return allRows;
}

function buildServiceQuery(filters: Filters, selectFields: string) {
  const params = new URLSearchParams({ select: selectFields, order: sortOrder(filters.sort) });

  if (filters.q.trim()) {
    const q = cleanToken(filters.q);
    params.set('or', `(business_name.ilike.*${q}*,service_name.ilike.*${q}*)`);
  }

  if (filters.businessName.trim()) {
    params.set('business_name', `ilike.*${cleanToken(filters.businessName)}*`);
  }
  if (filters.serviceName.trim()) {
    params.set('service_name', `ilike.*${cleanToken(filters.serviceName)}*`);
  }
  if (filters.businessId.trim()) {
    params.set('business_id', `eq.${cleanToken(filters.businessId)}`);
  }
  if (filters.serviceId.trim()) {
    params.set('service_id', `eq.${cleanToken(filters.serviceId)}`);
  }
  if (filters.currencyCode.trim()) {
    params.set('currency_code', `eq.${cleanToken(filters.currencyCode.toUpperCase())}`);
  }

  if (filters.country.trim()) {
    params.set('country_code', `eq.${filters.country.trim().toUpperCase()}`);
  }
  if (filters.city.trim()) {
    params.set('city', `ilike.*${cleanToken(filters.city)}*`);
  }
  if (filters.region.trim()) {
    params.set('region', `ilike.*${cleanToken(filters.region)}*`);
  }
  if (filters.businessTypes.length > 0) {
    params.set('business_type_code', `in.(${filters.businessTypes.map(cleanToken).join(',')})`);
  }
  if (filters.categories.length > 0) {
    params.set('service_category_code', `in.(${filters.categories.map(cleanToken).join(',')})`);
  }
  if (filters.priceKinds.length > 0) {
    params.set('price_kind', `in.(${filters.priceKinds.map(cleanToken).join(',')})`);
  }
  if (filters.minPrice !== null) {
    params.set('price_cents', `gte.${filters.minPrice * 100}`);
  }
  if (filters.maxPrice !== null) {
    params.append('price_cents', `lte.${filters.maxPrice * 100}`);
  }
  if (filters.minDuration !== null) {
    params.set('duration_minutes', `gte.${filters.minDuration}`);
  }
  if (filters.maxDuration !== null) {
    params.append('duration_minutes', `lte.${filters.maxDuration}`);
  }
  if (filters.durationExact !== null) {
    params.set('duration_minutes', `eq.${filters.durationExact}`);
  }

  return params;
}

function cleanToken(value: string) {
  return value.trim().replaceAll(',', ' ').replaceAll('(', ' ').replaceAll(')', ' ');
}

export function sortOrder(sort: Filters['sort']) {
  return SORT_OPTIONS.find((s) => s.key === sort)?.order ?? SORT_OPTIONS[0].order;
}

function effectivePriceCents(row: ServiceItem) {
  if (typeof row.price_cents === 'number') return row.price_cents;
  if (typeof row.price_min_cents === 'number') return row.price_min_cents;
  if (typeof row.price_max_cents === 'number') return row.price_max_cents;
  return null;
}

function buildBusinessCards(rows: ServiceItem[]): BusinessCard[] {
  const grouped = new Map<string, BusinessCard>();

  rows.forEach((row, idx) => {
    const businessId = row.business_id ?? `business-${idx}`;
    const businessName = row.business_name ?? 'Negocio sin nombre';
    const key = `${businessId}|${businessName}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        business_id: row.business_id,
        business_name: businessName,
        business_type_label: row.business_type_label ?? row.business_type_code ?? '-',
        country_code: row.country_code,
        region: row.region,
        city: row.city,
        service_count: 0,
        min_price_cents: null,
        max_price_cents: null,
        categories: [],
      });
    }

    const card = grouped.get(key)!;
    card.service_count += 1;

    const category = row.service_category_label ?? row.service_category_code;
    if (category && !card.categories.includes(category)) {
      card.categories.push(category);
    }

    const price = effectivePriceCents(row);
    if (typeof price === 'number') {
      card.min_price_cents = card.min_price_cents === null ? price : Math.min(card.min_price_cents, price);
      card.max_price_cents = card.max_price_cents === null ? price : Math.max(card.max_price_cents, price);
    }
  });

  return [...grouped.values()].sort((a, b) => b.service_count - a.service_count);
}
