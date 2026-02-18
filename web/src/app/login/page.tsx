'use client';

import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/auth/client';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const next = searchParams.get('next') || '/items';
      const canonicalAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
      const origin = canonicalAppUrl || window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (signInError) throw signInError;
      setSuccess('Revisa tu email para completar el acceso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box maxWidth={520} mx="auto">
      <Card className="glass-panel">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h4">Acceso</Typography>
            <Typography color="text.secondary">
              Inicia sesion para usar tus creditos y gestionar tu suscripcion.
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {success ? <Alert severity="success">{success}</Alert> : null}
            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  fullWidth
                />
                <Button type="submit" variant="contained" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Enviar enlace magico'}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
