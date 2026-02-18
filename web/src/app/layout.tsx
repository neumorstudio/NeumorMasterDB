import type { Metadata } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from '@mui/material';
import Link from 'next/link';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { getServerUser } from '@/lib/auth/server';
import { Providers } from './providers';
import './globals.css';

const fontSans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontDisplay = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Directorio Neumor',
  description: 'Busqueda y filtrado de negocios y servicios con Supabase y Next.js',
  openGraph: {
    title: 'Directorio Neumor',
    description: 'Explora servicios y negocios con filtros avanzados y paginacion server-side.',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  return (
    <html lang="es">
      <body className={`${fontSans.variable} ${fontDisplay.variable}`}>
        <AppRouterCacheProvider>
          <Providers>
            <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #d7e0ea' }}>
              <Container maxWidth="xl">
                <Toolbar disableGutters sx={{ py: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
                    <Typography variant="h6" fontWeight={700}>
                      Neumor Directory
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {user ? (
                        <>
                          <Button component={Link} href="/billing" size="small" variant="outlined">
                            Plan
                          </Button>
                          <Button component={Link} href="/auth/logout" size="small">
                            Salir
                          </Button>
                        </>
                      ) : (
                        <Button component={Link} href="/login" size="small" variant="contained">
                          Entrar
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Toolbar>
              </Container>
            </AppBar>
            <Container component="main" maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 1.5, sm: 3 } }}>
              <Box>{children}</Box>
            </Container>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
