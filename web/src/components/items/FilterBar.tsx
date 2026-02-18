'use client';

import React from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Chip,
  Backdrop,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { calculateSearchCreditCost, countActiveAdvancedFilters } from '@/lib/credits/cost';
import {
  PAGE_SIZE_OPTIONS,
  PRICE_KIND_OPTIONS,
  SORT_OPTIONS,
} from '@/lib/filters/constants';
import { filtersToSearchParams } from '@/lib/filters/schema';
import type { Filters, ReferenceOption } from '@/types/items';

type Props = {
  filters: Filters;
  businessTypes: ReferenceOption[];
};

export function FilterBar({ filters, businessTypes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const currentParams = useSearchParams();

  const [form, setForm] = useState(filters);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setForm(filters);
    setIsNavigating(false);
  }, [filters]);

  const pushFilters = (next: Filters) => {
    const params = filtersToSearchParams(next);
    setIsNavigating(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.q === filters.q) return;
      pushFilters({ ...form, page: 1 });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.q]);

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(filters), [form, filters]);
  const activeAdvancedFilters = useMemo(() => countActiveAdvancedFilters(form), [form]);
  const dynamicSearchCost = useMemo(() => calculateSearchCreditCost(form), [form]);
  const formatCredits = (value: number) => `${value} ${value === 1 ? 'credito' : 'creditos'}`;

  const applyQuickView = (nextView: Filters['view']) => {
    const next: Filters = {
      ...form,
      view: nextView,
      scope: nextView === 'table' ? 'services' : form.scope,
      page: 1,
    };
    setForm(next);
    pushFilters(next);
  };

  const applyQuickScope = (nextScope: Filters['scope']) => {
    const next: Filters = { ...form, scope: nextScope, view: 'cards', page: 1 };
    setForm(next);
    pushFilters(next);
  };

  return (
    <>
      <Card className="glass-panel">
        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
          <Stack spacing={{ xs: 1.5, sm: 2 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
            >
              <ToggleButtonGroup
                value={form.view}
                exclusive
                size="small"
                color="primary"
                onChange={(_, value: Filters['view'] | null) => {
                  if (!value || value === form.view || isNavigating) return;
                  applyQuickView(value);
                }}
              >
                <ToggleButton value="cards">Tarjetas</ToggleButton>
                <ToggleButton value="table">Tabla</ToggleButton>
              </ToggleButtonGroup>

              {form.view === 'cards' ? (
                <ToggleButtonGroup
                  value={form.scope}
                  exclusive
                  size="small"
                  color="primary"
                  onChange={(_, value: Filters['scope'] | null) => {
                    if (!value || value === form.scope || isNavigating) return;
                    applyQuickScope(value);
                  }}
                >
                  <ToggleButton value="businesses">Negocios</ToggleButton>
                  <ToggleButton value="services">Servicios</ToggleButton>
                </ToggleButtonGroup>
              ) : null}
            </Stack>

            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Buscar"
                  value={form.q}
                  onChange={(e) => setForm((prev) => ({ ...prev, q: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField
                  label="Ciudad"
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value, page: 1 }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField
                  label="Pais"
                  inputProps={{ maxLength: 2 }}
                  value={form.country}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, country: e.target.value.toUpperCase(), page: 1 }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="sort-label">Orden</InputLabel>
                  <Select
                    labelId="sort-label"
                    label="Orden"
                    value={form.sort}
                    onChange={(e) => setForm((prev) => ({ ...prev, sort: e.target.value as Filters['sort'] }))}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <MenuItem key={option.key} value={option.key}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="pagesize-label">Tamano pagina</InputLabel>
                  <Select
                    labelId="pagesize-label"
                    label="Tamano pagina"
                    value={String(form.pageSize)}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))
                    }
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <MenuItem key={size} value={String(size)}>
                        {size}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="business-types-label">Tipo de negocio</InputLabel>
                  <Select
                    labelId="business-types-label"
                    multiple
                    label="Tipo de negocio"
                    value={form.businessTypes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, businessTypes: e.target.value as string[], page: 1 }))
                    }
                  >
                    {businessTypes.map((option) => (
                      <MenuItem key={option.code} value={option.code}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  label="Precio min (EUR)"
                  type="number"
                  value={form.minPrice ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      minPrice: e.target.value === '' ? null : Number(e.target.value),
                      page: 1,
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  label="Precio max (EUR)"
                  type="number"
                  value={form.maxPrice ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      maxPrice: e.target.value === '' ? null : Number(e.target.value),
                      page: 1,
                    }))
                  }
                  fullWidth
                />
              </Grid>
            </Grid>

            <Accordion
              disableGutters
              sx={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(171, 189, 205, 0.35)',
                borderRadius: 2,
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 1, sm: 2 } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.advancedMode}
                      onChange={(_, checked) => setForm((prev) => ({ ...prev, advancedMode: checked }))}
                    />
                  }
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  label="Modo avanzado"
                />
              </AccordionSummary>
              <AccordionDetails sx={{ px: { xs: 1, sm: 2 }, pb: { xs: 1.5, sm: 2 } }}>
                {form.advancedMode ? (
                  <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                    <Grid size={{ xs: 12 }}>
                      <Alert
                        severity="info"
                        sx={{
                          border: '1px solid rgba(125, 162, 194, 0.35)',
                          backgroundColor: 'rgba(227, 241, 252, 0.46)',
                        }}
                      >
                        Esta busqueda costara <strong>{formatCredits(dynamicSearchCost)}</strong>: 1 base +{' '}
                        <strong>{formatCredits(activeAdvancedFilters)}</strong> por filtros avanzados activos.
                      </Alert>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        label="Service ID"
                        value={form.serviceId}
                        onChange={(e) => setForm((prev) => ({ ...prev, serviceId: e.target.value, page: 1 }))}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        label="Business ID"
                        value={form.businessId}
                        onChange={(e) => setForm((prev) => ({ ...prev, businessId: e.target.value, page: 1 }))}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        label="Nombre servicio"
                        value={form.serviceName}
                        onChange={(e) => setForm((prev) => ({ ...prev, serviceName: e.target.value, page: 1 }))}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        label="Nombre negocio"
                        value={form.businessName}
                        onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value, page: 1 }))}
                        fullWidth
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        label="Moneda (ISO)"
                        value={form.currencyCode}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, currencyCode: e.target.value.toUpperCase(), page: 1 }))
                        }
                        inputProps={{ maxLength: 3 }}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        label="Telefono"
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value, page: 1 }))}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        label="Duracion exacta (min)"
                        type="number"
                        value={form.durationExact ?? ''}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            durationExact: e.target.value === '' ? null : Number(e.target.value),
                            page: 1,
                          }))
                        }
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth>
                        <InputLabel id="price-kinds-label">Tipo de precio</InputLabel>
                        <Select
                          labelId="price-kinds-label"
                          multiple
                          label="Tipo de precio"
                          value={form.priceKinds}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, priceKinds: e.target.value as string[], page: 1 }))
                          }
                        >
                          {PRICE_KIND_OPTIONS.map((option) => (
                            <MenuItem key={option.code} value={option.code}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        label="Region"
                        value={form.region}
                        onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value, page: 1 }))}
                        fullWidth
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        label="Duracion min"
                        type="number"
                        value={form.minDuration ?? ''}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            minDuration: e.target.value === '' ? null : Number(e.target.value),
                            page: 1,
                          }))
                        }
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        label="Duracion max"
                        type="number"
                        value={form.maxDuration ?? ''}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            maxDuration: e.target.value === '' ? null : Number(e.target.value),
                            page: 1,
                          }))
                        }
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Activa el modo avanzado para filtrar por IDs, nombres exactos, moneda, tipo de precio y duracion.
                    Cada filtro avanzado activo suma 1 credito al coste base de busqueda.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>

            <Box display="flex" gap={1} flexWrap="wrap" flexDirection={{ xs: 'column', sm: 'row' }}>
              <Chip
                label={`Coste estimado: ${formatCredits(dynamicSearchCost)}`}
                color={dynamicSearchCost > 1 ? 'secondary' : 'default'}
                variant={dynamicSearchCost > 1 ? 'filled' : 'outlined'}
                sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, width: { xs: '100%', sm: 'auto' } }}
              />
              <Button
                variant="contained"
                onClick={() => pushFilters({ ...form, page: 1 })}
                disabled={isNavigating || (!hasChanges && currentParams.toString().length > 0)}
                fullWidth={false}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Aplicar filtros
              </Button>
              <Button
                variant="text"
                disabled={isNavigating}
                onClick={() => pushFilters({ ...form, showAll: true, page: 1 })}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Mostrar todo
              </Button>
              <Button
                variant="outlined"
                disabled={isNavigating}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
                onClick={() => {
                  const defaults = {
                    ...filters,
                    q: '',
                    showAll: false,
                    serviceId: '',
                    businessId: '',
                    serviceName: '',
                    businessName: '',
                    currencyCode: '',
                    phone: '',
                    durationExact: null,
                    city: '',
                    region: '',
                    businessTypes: [],
                    categories: [],
                    priceKinds: [],
                    minDuration: null,
                    maxDuration: 240,
                    page: 1,
                  };
                  setForm(defaults);
                  pushFilters(defaults);
                }}
              >
                Limpiar
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
      <Backdrop
        open={isNavigating}
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 10, flexDirection: 'column', gap: 2 }}
      >
        <CircularProgress color="inherit" />
        <Typography variant="body1">Consultando base de datos...</Typography>
      </Backdrop>
    </>
  );
}
