'use client';

import { Alert, Button, Stack } from '@mui/material';
import { useState } from 'react';

type Plan = 'starter' | 'pro' | 'agency';

export function PlansClient() {
  const [error, setError] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);

  const startCheckout = async (plan: Plan) => {
    setError(null);
    setLoadingPlan(plan);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !json.url) {
        throw new Error(json.error || 'No se pudo crear la sesion de pago');
      }
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
      setLoadingPlan(null);
    }
  };

  return (
    <Stack spacing={1.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Button variant="outlined" disabled={Boolean(loadingPlan)} onClick={() => void startCheckout('starter')}>
        {loadingPlan === 'starter' ? 'Abriendo Stripe...' : 'Elegir Starter'}
      </Button>
      <Button variant="contained" disabled={Boolean(loadingPlan)} onClick={() => void startCheckout('pro')}>
        {loadingPlan === 'pro' ? 'Abriendo Stripe...' : 'Elegir Pro'}
      </Button>
      <Button variant="outlined" disabled={Boolean(loadingPlan)} onClick={() => void startCheckout('agency')}>
        {loadingPlan === 'agency' ? 'Abriendo Stripe...' : 'Elegir Agency'}
      </Button>
    </Stack>
  );
}
