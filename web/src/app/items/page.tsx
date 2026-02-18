import { Alert, Button, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { FilterBar } from '@/components/items/FilterBar';
import { Pagination } from '@/components/items/Pagination';
import { getServerUser } from '@/lib/auth/server';
import { buildQueryFingerprint, consumeUserSearchCredit, getUserCreditStatus, type UserCreditStatus } from '@/lib/credits/user';
import { ResultsView } from '@/components/items/ResultsView';
import { StatusState } from '@/components/common/StatusState';
import { listItems, getReferences } from '@/lib/data/items';
import { parseFilters } from '@/lib/filters/schema';
import { logServerError } from '@/lib/utils/logger';
import type { Filters } from '@/types/items';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ItemsPage({ searchParams }: Props) {
  const user = await getServerUser();
  const params = await searchParams;
  const filters = parseFilters(params);

  const shouldFetch = hasActiveFilters(filters) || filters.showAll;
  const shouldCharge = shouldFetch && filters.page === 1;

  if (!user) {
    return (
      <Stack spacing={2}>
        <Typography variant="h3" component="h1" fontWeight={700} sx={{ fontSize: { xs: '2rem', md: '3rem' } }}>
          Directorio de Servicios
        </Typography>
        <Alert severity="info" className="glass-panel">
          Inicia sesion para usar busquedas con creditos y guardar tu plan.
        </Alert>
        <Button component={Link} href="/login?next=/items" variant="contained" sx={{ width: 'fit-content' }}>
          Iniciar sesion
        </Button>
      </Stack>
    );
  }

  const references = await getReferences();
  let creditStatus: UserCreditStatus = { ok: true, remaining_credits: 0, used_credits: 0 };
  let creditBlocked = false;

  try {
    creditStatus = await getUserCreditStatus(user.id);
  } catch (error) {
    logServerError('credits.status.failed', error, { userId: user.id });
  }

  if (shouldCharge) {
    try {
      const fingerprint = buildQueryFingerprint(JSON.stringify({ ...filters, page: 1 }));
      creditStatus = await consumeUserSearchCredit({
        userId: user.id,
        endpoint: 'items_page',
        queryFingerprint: fingerprint,
      });
      if (!creditStatus.ok) creditBlocked = true;
    } catch (error) {
      logServerError('credits.consume.failed', error, { userId: user.id });
    }
  }

  if (creditBlocked) {
    return (
      <Stack spacing={2}>
        <Typography variant="h3" component="h1" fontWeight={700} sx={{ fontSize: { xs: '2rem', md: '3rem' } }}>
          Directorio de Servicios
        </Typography>
        <Alert severity="warning" className="glass-panel">
          Creditos agotados. Te quedan {creditStatus.remaining_credits ?? 0} creditos este mes.
        </Alert>
        <StatusState
          title="Sin creditos disponibles"
          description="Has alcanzado el limite mensual de busquedas. Amplia tu plan o espera al siguiente ciclo."
          actionLabel="Gestionar plan"
          actionHref="/billing"
        />
      </Stack>
    );
  }

  const result = shouldFetch ? await listItems(filters) : null;

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h3" component="h1" fontWeight={700} sx={{ fontSize: { xs: '2rem', md: '3rem' } }}>
          Directorio de Servicios
        </Typography>
        <Typography color="text.secondary">
          Explora negocios y servicios con filtros avanzados.
        </Typography>
      </Stack>
      <Alert severity="success" className="glass-panel">
        Plan: {creditStatus.plan_code ?? 'free'} | Creditos restantes: {creditStatus.remaining_credits ?? 0} |
        Consumidos: {creditStatus.used_credits ?? 0}
      </Alert>

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
