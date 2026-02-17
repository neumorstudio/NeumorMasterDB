import type { ServiceItem } from '@/types/items';

export function formatMoney(cents: number | null, currency = 'EUR') {
  if (cents === null) return 'Consultar';
  const value = cents / 100;
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(value);
}

export function formatServicePrice(item: ServiceItem) {
  const currency = item.currency_code ?? 'EUR';
  const kind = (item.price_kind ?? '').toLowerCase();

  if (kind === 'fixed' && item.price_cents !== null) return formatMoney(item.price_cents, currency);
  if (kind === 'from' && item.price_min_cents !== null)
    return `Desde ${formatMoney(item.price_min_cents, currency)}`;
  if (kind === 'range' && item.price_min_cents !== null && item.price_max_cents !== null) {
    return `${formatMoney(item.price_min_cents, currency)} - ${formatMoney(item.price_max_cents, currency)}`;
  }

  if (item.price_cents !== null) return formatMoney(item.price_cents, currency);
  return 'Consultar';
}
