'use client';

import { Alert, Button, Stack } from '@mui/material';

export default function ItemsError({ reset }: { reset: () => void }) {
  return (
    <Stack spacing={2}>
      <Alert severity="error">No se pudo cargar el listado. Reintenta en unos segundos.</Alert>
      <Button variant="contained" onClick={() => reset()}>
        Reintentar
      </Button>
    </Stack>
  );
}
