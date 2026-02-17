import type { Metadata } from 'next';
import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Neumor Directory',
  description: 'Busqueda y filtrado de negocios y servicios con Supabase y Next.js',
  openGraph: {
    title: 'Neumor Directory',
    description: 'Explora servicios y negocios con filtros avanzados y paginacion server-side.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AppRouterCacheProvider>
          <Providers>
            <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #e2e8f0' }}>
              <Container maxWidth="xl">
                <Toolbar disableGutters sx={{ py: 1 }}>
                  <Typography variant="h6" fontWeight={700}>
                    Neumor Directory
                  </Typography>
                </Toolbar>
              </Container>
            </AppBar>
            <Container component="main" maxWidth="xl" sx={{ py: 4 }}>
              <Box>{children}</Box>
            </Container>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
