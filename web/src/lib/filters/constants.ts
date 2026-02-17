import type { CardScope, SortKey, ViewMode } from '@/types/items';

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

export const SORT_OPTIONS: Array<{ key: SortKey; label: string; order: string }> = [
  { key: 'relevance', label: 'Relevancia (Negocio A-Z)', order: 'business_name.asc,service_name.asc' },
  { key: 'price_asc', label: 'Precio: menor a mayor', order: 'price_cents.asc.nullslast,service_name.asc' },
  { key: 'price_desc', label: 'Precio: mayor a menor', order: 'price_cents.desc.nullslast,service_name.asc' },
  { key: 'duration_asc', label: 'Duracion: corta a larga', order: 'duration_minutes.asc.nullslast,service_name.asc' },
  { key: 'duration_desc', label: 'Duracion: larga a corta', order: 'duration_minutes.desc.nullslast,service_name.asc' },
];

export const PRICE_KIND_OPTIONS = [
  { code: 'fixed', label: 'Precio fijo' },
  { code: 'from', label: 'Desde' },
  { code: 'range', label: 'Rango' },
  { code: 'quote', label: 'Consultar' },
] as const;

export const VIEW_OPTIONS: Array<{ key: ViewMode; label: string }> = [
  { key: 'cards', label: 'Tarjetas' },
  { key: 'table', label: 'Tabla' },
];

export const CARD_SCOPE_OPTIONS: Array<{ key: CardScope; label: string }> = [
  { key: 'businesses', label: 'Negocios' },
  { key: 'services', label: 'Servicios' },
];

export const DEFAULT_FILTERS = {
  q: '',
  country: 'ES',
  city: '',
  region: '',
  businessTypes: [] as string[],
  categories: [] as string[],
  priceKinds: [] as string[],
  minPrice: null,
  maxPrice: 250,
  minDuration: null,
  maxDuration: 240,
  sort: 'relevance' as SortKey,
  page: 1,
  pageSize: 25,
  view: 'cards' as ViewMode,
  scope: 'businesses' as CardScope,
};
