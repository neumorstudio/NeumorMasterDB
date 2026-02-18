import type { Metadata } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${fontSans.variable} ${fontDisplay.variable}`}>
        <AppRouterCacheProvider>
          <Providers>
            <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #d7e0ea' }}>
              <Container maxWidth="xl">
                <Toolbar disableGutters sx={{ py: 1 }}>
                  <Typography variant="h6" fontWeight={700}>
                    Neumor Directory
                  </Typography>
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
