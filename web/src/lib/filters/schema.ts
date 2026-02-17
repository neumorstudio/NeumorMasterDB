import { z } from 'zod';
import { DEFAULT_FILTERS, PAGE_SIZE_OPTIONS } from './constants';
import type { Filters } from '@/types/items';

const sortSchema = z.enum(['relevance', 'price_asc', 'price_desc', 'duration_asc', 'duration_desc']);
const viewSchema = z.enum(['cards', 'table']);
const scopeSchema = z.enum(['businesses', 'services']);

const maybeNumber = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : Number(v)))
  .pipe(z.number().int().nonnegative().nullable())
  .optional();

const schema = z.object({
  q: z.string().trim().max(120).optional(),
  advancedMode: z.string().trim().optional(),
  serviceId: z.string().trim().max(120).optional(),
  businessId: z.string().trim().max(120).optional(),
  serviceName: z.string().trim().max(120).optional(),
  businessName: z.string().trim().max(120).optional(),
  currencyCode: z.string().trim().max(3).optional(),
  durationExact: maybeNumber,
  country: z.string().trim().max(2).optional(),
  city: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  businessTypes: z.string().optional(),
  categories: z.string().optional(),
  priceKinds: z.string().optional(),
  minPrice: maybeNumber,
  maxPrice: maybeNumber,
  minDuration: maybeNumber,
  maxDuration: maybeNumber,
  sort: sortSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce
    .number()
    .int()
    .refine((v) => PAGE_SIZE_OPTIONS.includes(v as (typeof PAGE_SIZE_OPTIONS)[number]))
    .optional(),
  view: viewSchema.optional(),
  scope: scopeSchema.optional(),
});

function splitCsv(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return value === '1' || value.toLowerCase() === 'true';
}

export function parseFilters(input: Record<string, string | string[] | undefined>): Filters {
  const normalized = Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );

  const parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    return { ...DEFAULT_FILTERS };
  }

  const data = parsed.data;

  return {
    q: data.q ?? DEFAULT_FILTERS.q,
    advancedMode: parseBoolean(data.advancedMode),
    serviceId: data.serviceId ?? DEFAULT_FILTERS.serviceId,
    businessId: data.businessId ?? DEFAULT_FILTERS.businessId,
    serviceName: data.serviceName ?? DEFAULT_FILTERS.serviceName,
    businessName: data.businessName ?? DEFAULT_FILTERS.businessName,
    currencyCode: (data.currencyCode ?? DEFAULT_FILTERS.currencyCode).toUpperCase(),
    durationExact: data.durationExact ?? DEFAULT_FILTERS.durationExact,
    country: (data.country ?? DEFAULT_FILTERS.country).toUpperCase(),
    city: data.city ?? DEFAULT_FILTERS.city,
    region: data.region ?? DEFAULT_FILTERS.region,
    businessTypes: splitCsv(data.businessTypes),
    categories: splitCsv(data.categories),
    priceKinds: splitCsv(data.priceKinds),
    minPrice: data.minPrice ?? DEFAULT_FILTERS.minPrice,
    maxPrice: data.maxPrice ?? DEFAULT_FILTERS.maxPrice,
    minDuration: data.minDuration ?? DEFAULT_FILTERS.minDuration,
    maxDuration: data.maxDuration ?? DEFAULT_FILTERS.maxDuration,
    sort: data.sort ?? DEFAULT_FILTERS.sort,
    page: data.page ?? DEFAULT_FILTERS.page,
    pageSize: data.pageSize ?? DEFAULT_FILTERS.pageSize,
    view: data.view ?? DEFAULT_FILTERS.view,
    scope: data.scope ?? DEFAULT_FILTERS.scope,
  };
}

export function filtersToSearchParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();

  const put = (key: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return;
    params.set(key, String(value));
  };

  put('q', filters.q);
  put('advancedMode', filters.advancedMode ? '1' : '');
  put('serviceId', filters.serviceId);
  put('businessId', filters.businessId);
  put('serviceName', filters.serviceName);
  put('businessName', filters.businessName);
  put('currencyCode', filters.currencyCode);
  put('durationExact', filters.durationExact);
  put('country', filters.country);
  put('city', filters.city);
  put('region', filters.region);
  put('businessTypes', filters.businessTypes.join(','));
  put('categories', filters.categories.join(','));
  put('priceKinds', filters.priceKinds.join(','));
  put('minPrice', filters.minPrice);
  put('maxPrice', filters.maxPrice);
  put('minDuration', filters.minDuration);
  put('maxDuration', filters.maxDuration);
  put('sort', filters.sort);
  put('page', filters.page);
  put('pageSize', filters.pageSize);
  put('view', filters.view);
  put('scope', filters.scope);

  return params;
}
