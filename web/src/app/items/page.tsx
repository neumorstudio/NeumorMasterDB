import { Alert, Stack, Typography } from '@mui/material';
import { FilterBar } from '@/components/items/FilterBar';
import { Pagination } from '@/components/items/Pagination';
import { ResultsView } from '@/components/items/ResultsView';
import { StatusState } from '@/components/common/StatusState';
import { listItems, getReferences } from '@/lib/data/items';
import { parseFilters } from '@/lib/filters/schema';
import type { Filters } from '@/types/items';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ItemsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const shouldFetch = hasActiveFilters(filters) || filters.showAll;
  const references = await getReferences();
  const result = shouldFetch ? await listItems(filters) : null;

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h3" component="h1" fontWeight={700}>
          Directorio de Servicios
        </Typography>
        <Typography color="text.secondary">
          Explora negocios y servicios con filtros avanzados.
        </Typography>
      </Stack>

      <FilterBar
        filters={filters}
        businessTypes={references.businessTypes}
      />

      {!shouldFetch ? (
        <StatusState
          title="Listado no cargado"
          description="Para mejorar rendimiento no mostramos todo por defecto. Aplica filtros o pulsa 'Mostrar todo'."
          actionLabel="Mostrar todo"
          actionHref="/items?showAll=1"
        />
      ) : (
        <>
          <Alert severity="info" className="glass-panel">
            Total: {result?.total ?? 0} | Pagina: {result?.page ?? 1}/{result?.totalPages ?? 1}
          </Alert>

          {(result?.total ?? 0) === 0 ? (
            <StatusState
              title="Sin resultados"
              description="No encontramos datos con estos filtros. Prueba ampliar rango de precio o limpiar filtros."
              actionLabel="Resetear"
              actionHref="/items"
            />
          ) : (
            <>
              <ResultsView
                filters={filters}
                services={result?.services ?? []}
                businesses={result?.businesses ?? []}
              />
              <Pagination page={result?.page ?? 1} totalPages={result?.totalPages ?? 1} />
            </>
          )}
        </>
      )}
    </Stack>
  );
}

function hasActiveFilters(filters: Filters) {
  return Boolean(
    filters.q.trim() ||
      filters.serviceId.trim() ||
      filters.businessId.trim() ||
      filters.serviceName.trim() ||
      filters.businessName.trim() ||
      filters.currencyCode.trim() ||
      filters.phone.trim() ||
      filters.durationExact !== null ||
      filters.city.trim() ||
      filters.region.trim() ||
      filters.country !== 'ES' ||
      filters.businessTypes.length > 0 ||
      filters.categories.length > 0 ||
      filters.priceKinds.length > 0 ||
      filters.minPrice !== null ||
      filters.maxPrice !== 250 ||
      filters.minDuration !== null ||
      filters.maxDuration !== 240
  );
}
