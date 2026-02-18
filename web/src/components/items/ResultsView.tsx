'use client';

import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatMoney, formatServicePrice } from '@/lib/filters/format';
import type { BusinessCard, Filters, ServiceItem } from '@/types/items';

type Props = {
  filters: Filters;
  services: ServiceItem[];
  businesses: BusinessCard[];
};

type BusinessDetailResponse = {
  business: {
    business_id: string | null;
    business_name: string;
    business_phone: string | null;
    business_type_label: string;
    business_type_code: string | null;
    country_code: string | null;
    region: string | null;
    city: string | null;
    service_count: number;
    categories: string[];
    min_price_cents: number | null;
    max_price_cents: number | null;
  };
  services: ServiceItem[];
};

type BusinessSortField = 'service_id' | 'service_name' | 'price' | 'duration';

export function ResultsView({ filters, services, businesses }: Props) {
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(false);
  const [businessDetail, setBusinessDetail] = useState<BusinessDetailResponse | null>(null);
  const [businessDetailError, setBusinessDetailError] = useState<string | null>(null);
  const [businessSortField, setBusinessSortField] = useState<BusinessSortField>('service_name');
  const [businessSortDirection, setBusinessSortDirection] = useState<'asc' | 'desc'>('asc');

  const serviceRows = useMemo(() => businessDetail?.services ?? [], [businessDetail]);
  const sortedServiceRows = useMemo(() => {
    const rows = [...serviceRows];
    rows.sort((a, b) => {
      const left = getSortValue(a, businessSortField);
      const right = getSortValue(b, businessSortField);
      const cmp = compareSortValues(left, right);
      return businessSortDirection === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [serviceRows, businessSortDirection, businessSortField]);

  const openBusinessDetail = async (businessId: string | null) => {
    if (!businessId) return;
    setBusinessModalOpen(true);
    setIsLoadingBusiness(true);
    setBusinessDetailError(null);

    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('No se pudo cargar el detalle del negocio.');
      }

      const json = (await response.json()) as BusinessDetailResponse;
      setBusinessDetail(json);
    } catch (error) {
      setBusinessDetail(null);
      setBusinessDetailError(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      setIsLoadingBusiness(false);
    }
  };

  const onSortBusinessTable = (field: BusinessSortField) => {
    if (businessSortField === field) {
      setBusinessSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setBusinessSortField(field);
    setBusinessSortDirection('asc');
  };

  if (filters.view === 'table') {
    return (
      <Card sx={{ mt: 2 }} className="glass-panel">
        <CardContent>
          <Table size="small" aria-label="tabla resultados">
            <TableHead>
              <TableRow>
                <TableCell>Negocio</TableCell>
                <TableCell>Servicio</TableCell>
                <TableCell>Ciudad</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Detalle</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map((item, idx) => (
                <TableRow key={`${item.service_id ?? 'service'}-${idx}`}>
                  <TableCell>{item.business_name ?? '-'}</TableCell>
                  <TableCell>{item.service_name ?? '-'}</TableCell>
                  <TableCell>{item.city ?? '-'}</TableCell>
                  <TableCell>{formatServicePrice(item)}</TableCell>
                  <TableCell>
                    {item.service_id ? (
                      <Button component={Link} href={`/items/${item.service_id}`} size="small">
                        Ver
                      </Button>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (filters.scope === 'businesses') {
    return (
      <>
        <Stack spacing={2} mt={2}>
          {businesses.map((item, idx) => (
            <Card key={`${item.business_id ?? 'biz'}-${idx}`} className="glass-card">
              <CardActionArea onClick={() => void openBusinessDetail(item.business_id)}>
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="h6">{item.business_name}</Typography>
                    <Typography color="text.secondary">{item.business_type_label}</Typography>
                    <Typography variant="body2" color="text.secondary">Telefono: {item.business_phone ?? '-'}</Typography>
                    <Typography>
                      Servicios: {item.service_count} | Precio:{' '}
                      {item.min_price_cents !== null ? formatMoney(item.min_price_cents) : 'Consultar'}
                      {item.max_price_cents !== null && item.max_price_cents !== item.min_price_cents
                        ? ` - ${formatMoney(item.max_price_cents)}`
                        : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Click para ver detalle completo
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>

        <Dialog
          open={businessModalOpen}
          onClose={() => setBusinessModalOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{ className: 'glass-panel' }}
        >
          <DialogTitle>{businessDetail?.business.business_name ?? 'Detalle de negocio'}</DialogTitle>
          <DialogContent>
            {isLoadingBusiness ? (
              <Stack direction="row" spacing={2} alignItems="center" py={2}>
                <CircularProgress size={24} />
                <Typography>Cargando datos del negocio...</Typography>
              </Stack>
            ) : businessDetailError ? (
              <Typography color="error">{businessDetailError}</Typography>
            ) : businessDetail ? (
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2">Business ID</Typography>
                    <Typography>{businessDetail.business.business_id ?? '-'}</Typography>
                  </Stack>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2">Tipo</Typography>
                    <Typography>
                      {businessDetail.business.business_type_label}
                      {businessDetail.business.business_type_code
                        ? ` (${businessDetail.business.business_type_code})`
                        : ''}
                    </Typography>
                  </Stack>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2">Telefono</Typography>
                    <Typography>{businessDetail.business.business_phone ?? '-'}</Typography>
                  </Stack>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2">Ubicacion</Typography>
                    <Typography>
                      {businessDetail.business.city ?? '-'} · {businessDetail.business.region ?? '-'} ·{' '}
                      {businessDetail.business.country_code ?? '-'}
                    </Typography>
                  </Stack>
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2">Servicios</Typography>
                    <Typography>{businessDetail.business.service_count}</Typography>
                  </Stack>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2">Rango de precio</Typography>
                    <Typography>
                      {businessDetail.business.min_price_cents !== null
                        ? formatMoney(businessDetail.business.min_price_cents)
                        : 'Consultar'}
                      {businessDetail.business.max_price_cents !== null &&
                      businessDetail.business.max_price_cents !== businessDetail.business.min_price_cents
                        ? ` - ${formatMoney(businessDetail.business.max_price_cents)}`
                        : ''}
                    </Typography>
                  </Stack>
                </Stack>

                <Divider />

                <Typography variant="h6">Servicios del negocio</Typography>
                <Table size="small" aria-label="servicios del negocio">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active={businessSortField === 'service_id'}
                          direction={businessSortField === 'service_id' ? businessSortDirection : 'asc'}
                          onClick={() => onSortBusinessTable('service_id')}
                        >
                          Service ID
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={businessSortField === 'service_name'}
                          direction={businessSortField === 'service_name' ? businessSortDirection : 'asc'}
                          onClick={() => onSortBusinessTable('service_name')}
                        >
                          Servicio
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={businessSortField === 'price'}
                          direction={businessSortField === 'price' ? businessSortDirection : 'asc'}
                          onClick={() => onSortBusinessTable('price')}
                        >
                          Precio
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={businessSortField === 'duration'}
                          direction={businessSortField === 'duration' ? businessSortDirection : 'asc'}
                          onClick={() => onSortBusinessTable('duration')}
                        >
                          Duracion
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedServiceRows.map((service, index) => (
                      <TableRow key={`${service.service_id ?? 'service'}-${index}`}>
                        <TableCell>{service.service_id ?? '-'}</TableCell>
                        <TableCell>{service.service_name ?? '-'}</TableCell>
                        <TableCell>{formatServicePrice(service)}</TableCell>
                        <TableCell>{service.duration_minutes !== null ? `${service.duration_minutes} min` : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Stack>
            ) : null}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Stack spacing={2} mt={2}>
      {services.map((item, idx) => (
        <Card key={`${item.service_id ?? 'service'}-${idx}`} className="glass-card">
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h6">{item.service_name ?? 'Servicio sin nombre'}</Typography>
              <Typography color="text.secondary">{item.business_name ?? 'Negocio sin nombre'}</Typography>
              <Typography variant="body2" color="text.secondary">Telefono: {item.business_phone ?? '-'}</Typography>
              <Typography>{formatServicePrice(item)}</Typography>
              {item.service_id ? (
                <Button component={Link} href={`/items/${item.service_id}`} sx={{ width: 'fit-content' }}>
                  Ver detalle
                </Button>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

function getSortValue(service: ServiceItem, field: BusinessSortField): number | string {
  if (field === 'service_id') return Number(service.service_id ?? Number.MAX_SAFE_INTEGER);
  if (field === 'service_name') return (service.service_name ?? '').toLowerCase();
  if (field === 'price') {
    if (typeof service.price_cents === 'number') return service.price_cents;
    if (typeof service.price_min_cents === 'number') return service.price_min_cents;
    if (typeof service.price_max_cents === 'number') return service.price_max_cents;
    return Number.MAX_SAFE_INTEGER;
  }
  return typeof service.duration_minutes === 'number' ? service.duration_minutes : Number.MAX_SAFE_INTEGER;
}

function compareSortValues(left: number | string, right: number | string) {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), 'es', { sensitivity: 'base' });
}

export function ViewModeToggle({ filters }: { filters: Filters }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mt={2}>
      <ToggleButtonGroup value={filters.view} exclusive>
        <ToggleButton value="cards" disabled>
          Tarjetas
        </ToggleButton>
        <ToggleButton value="table" disabled>
          Tabla
        </ToggleButton>
      </ToggleButtonGroup>
      {filters.view === 'cards' ? (
        <ToggleButtonGroup value={filters.scope} exclusive>
          <ToggleButton value="businesses" disabled>
            Negocios
          </ToggleButton>
          <ToggleButton value="services" disabled>
            Servicios
          </ToggleButton>
        </ToggleButtonGroup>
      ) : null}
    </Stack>
  );
}
