export type SortKey =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'duration_asc'
  | 'duration_desc';

export type ViewMode = 'cards' | 'table';
export type CardScope = 'businesses' | 'services';

export type Filters = {
  q: string;
  advancedMode: boolean;
  serviceId: string;
  businessId: string;
  serviceName: string;
  businessName: string;
  currencyCode: string;
  durationExact: number | null;
  country: string;
  city: string;
  region: string;
  businessTypes: string[];
  categories: string[];
  priceKinds: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minDuration: number | null;
  maxDuration: number | null;
  sort: SortKey;
  page: number;
  pageSize: number;
  view: ViewMode;
  scope: CardScope;
};

export type ServiceItem = {
  service_id: string | null;
  business_id: string | null;
  business_name: string | null;
  business_type_code: string | null;
  business_type_label: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  service_name: string | null;
  service_category_code: string | null;
  service_category_label: string | null;
  price_kind: string | null;
  currency_code: string | null;
  price_cents: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  duration_minutes: number | null;
};

export type BusinessCard = {
  business_id: string | null;
  business_name: string;
  business_type_label: string;
  country_code: string | null;
  region: string | null;
  city: string | null;
  service_count: number;
  min_price_cents: number | null;
  max_price_cents: number | null;
  categories: string[];
};

export type PagedResult = {
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  services: ServiceItem[];
  businesses: BusinessCard[];
};

export type ReferenceOption = { code: string; label: string };
export type References = {
  businessTypes: ReferenceOption[];
  serviceCategories: ReferenceOption[];
};
