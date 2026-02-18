import { Alert, Button, Stack } from '@mui/material';
import Link from 'next/link';

export default function ItemNotFound() {
  return (
    <Stack spacing={2}>
      <Alert severity="warning">No se encontró el servicio solicitado.</Alert>
      <Button component={Link} href="/items" variant="contained" sx={{ width: 'fit-content' }}>
        Volver al listado
      </Button>
    </Stack>
  );
}
