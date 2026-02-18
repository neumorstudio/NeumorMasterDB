import { Alert, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlansClient } from '@/components/billing/PlansClient';
import { getServerUser } from '@/lib/auth/server';
import { getUserCreditStatus } from '@/lib/credits/user';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BillingPage({ searchParams }: Props) {
  const user = await getServerUser();
  if (!user) {
    redirect('/login?next=/billing');
  }

  const params = await searchParams;
  const success = (Array.isArray(params.success) ? params.success[0] : params.success) === '1';
  const canceled = (Array.isArray(params.canceled) ? params.canceled[0] : params.canceled) === '1';
  const creditStatus = await getUserCreditStatus(user.id);

  return (
    <Stack spacing={2}>
      <Button component={Link} href="/items" variant="outlined" sx={{ width: 'fit-content' }}>
        Volver al directorio
      </Button>
      <Typography variant="h3">Suscripcion y creditos</Typography>
      {success ? <Alert severity="success">Pago completado. En breve veras tu plan actualizado.</Alert> : null}
      {canceled ? <Alert severity="info">Proceso de pago cancelado.</Alert> : null}

      <Card className="glass-panel">
        <CardContent>
          <Stack spacing={0.5}>
            <Typography variant="h6">Estado actual</Typography>
            <Typography>Plan: {creditStatus.plan_code ?? 'free'}</Typography>
            <Typography>Creditos restantes: {creditStatus.remaining_credits ?? 0}</Typography>
            <Typography>Creditos consumidos: {creditStatus.used_credits ?? 0}</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Cambiar plan</Typography>
            <PlansClient />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
