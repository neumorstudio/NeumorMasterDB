'use client';

import React from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Typography,
} from '@mui/material';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  CARD_SCOPE_OPTIONS,
  PAGE_SIZE_OPTIONS,
  PRICE_KIND_OPTIONS,
  SORT_OPTIONS,
  VIEW_OPTIONS,
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

  return (
    <>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Grid container spacing={2}>
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
                  <InputLabel id="pagesize-label">Pagina</InputLabel>
                  <Select
                    labelId="pagesize-label"
                    label="Pagina"
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

            <Grid container spacing={2}>
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

            <Accordion disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
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
              <AccordionDetails>
                {form.advancedMode ? (
                  <Grid container spacing={2}>
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
                      <FormControl fullWidth>
                        <InputLabel id="view-label">Vista</InputLabel>
                        <Select
                          labelId="view-label"
                          label="Vista"
                          value={form.view}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, view: e.target.value as Filters['view'], page: 1 }))
                          }
                        >
                          {VIEW_OPTIONS.map((option) => (
                            <MenuItem key={option.key} value={option.key}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth>
                        <InputLabel id="scope-label">Scope tarjetas</InputLabel>
                        <Select
                          labelId="scope-label"
                          label="Scope tarjetas"
                          value={form.scope}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, scope: e.target.value as Filters['scope'], page: 1 }))
                          }
                        >
                          {CARD_SCOPE_OPTIONS.map((option) => (
                            <MenuItem key={option.key} value={option.key}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
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
                    Activa el modo avanzado para filtrar por IDs, nombres exactos, moneda, tipo de precio, duracion y vista.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>

            <Box display="flex" gap={1} flexWrap="wrap">
              <Button
                variant="contained"
                onClick={() => pushFilters({ ...form, page: 1 })}
                disabled={isNavigating || (!hasChanges && currentParams.toString().length > 0)}
              >
                Aplicar filtros
              </Button>
              <Button
                variant="text"
                disabled={isNavigating}
                onClick={() => pushFilters({ ...form, showAll: true, page: 1 })}
              >
                Mostrar todo
              </Button>
              <Button
                variant="outlined"
                disabled={isNavigating}
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
