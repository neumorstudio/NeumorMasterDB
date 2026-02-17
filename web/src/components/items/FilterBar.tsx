'use client';

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PAGE_SIZE_OPTIONS, SORT_OPTIONS } from '@/lib/filters/constants';
import { filtersToSearchParams } from '@/lib/filters/schema';
import type { Filters, ReferenceOption } from '@/types/items';

type Props = {
  filters: Filters;
  businessTypes: ReferenceOption[];
  categories: ReferenceOption[];
};

export function FilterBar({ filters, businessTypes, categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const currentParams = useSearchParams();

  const [form, setForm] = useState(filters);

  useEffect(() => {
    setForm(filters);
  }, [filters]);

  const pushFilters = (next: Filters) => {
    const params = filtersToSearchParams(next);
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

  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(filters);
  }, [form, filters]);

  return (
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
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                label="Pais"
                inputProps={{ maxLength: 2 }}
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value.toUpperCase() }))}
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
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="categories-label">Categoria</InputLabel>
                <Select
                  labelId="categories-label"
                  multiple
                  label="Categoria"
                  value={form.categories}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, categories: e.target.value as string[], page: 1 }))
                  }
                >
                  {categories.map((option) => (
                    <MenuItem key={option.code} value={option.code}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
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
            <Grid size={{ xs: 6, md: 2 }}>
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

          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              onClick={() => pushFilters({ ...form, page: 1 })}
              disabled={!hasChanges && currentParams.toString().length > 0}
            >
              Aplicar filtros
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                const defaults = { ...filters, q: '', city: '', region: '', businessTypes: [], categories: [], page: 1 };
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
  );
}
