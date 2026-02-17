import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="overline">NEUMOR DIRECTORY</Typography>
          <Typography variant="h3" component="h1" fontWeight={700}>
            Busqueda de negocios y servicios
          </Typography>
          <Typography color="text.secondary">
            Migracion inicial de Streamlit a Next.js App Router con filtros en URL, SSR y capa de datos centralizada.
          </Typography>
          <Button component={Link} href="/items" variant="contained" sx={{ width: 'fit-content' }}>
            Ir a items
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
