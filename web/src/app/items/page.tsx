import { Alert, Stack, Typography } from '@mui/material';
import { FilterBar } from '@/components/items/FilterBar';
import { Pagination } from '@/components/items/Pagination';
import { ResultsView } from '@/components/items/ResultsView';
import { StatusState } from '@/components/common/StatusState';
import { listItems, getReferences } from '@/lib/data/items';
import { parseFilters } from '@/lib/filters/schema';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ItemsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [references, result] = await Promise.all([getReferences(), listItems(filters)]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1" fontWeight={700}>
        Items
      </Typography>

      <FilterBar
        filters={filters}
        businessTypes={references.businessTypes}
        categories={references.serviceCategories}
      />

      <Alert severity="info">
        Total: {result.total} | Pagina: {result.page}/{result.totalPages}
      </Alert>

      {result.total === 0 ? (
        <StatusState
          title="Sin resultados"
          description="No encontramos datos con estos filtros. Prueba ampliar rango de precio o limpiar categoria."
          actionLabel="Resetear"
          actionHref="/items"
        />
      ) : (
        <>
          <ResultsView filters={filters} services={result.services} businesses={result.businesses} />
          <Pagination page={result.page} totalPages={result.totalPages} />
        </>
      )}
    </Stack>
  );
}
