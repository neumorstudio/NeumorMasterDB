'use client';

import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { PropsWithChildren, useMemo } from 'react';

export function Providers({ children }: PropsWithChildren) {
  const theme = useMemo(
    () =>
      createTheme({
        cssVariables: true,
        palette: {
          mode: 'light',
          primary: { main: '#1c3550' },
          secondary: { main: '#3f729b' },
          background: { default: '#ecf2f8', paper: 'rgba(255, 255, 255, 0.72)' },
        },
        shape: { borderRadius: 12 },
        typography: {
          fontFamily: "var(--font-sans), 'Segoe UI', sans-serif",
          h1: { fontFamily: "var(--font-display), 'Times New Roman', serif", fontWeight: 600 },
          h2: { fontFamily: "var(--font-display), 'Times New Roman', serif", fontWeight: 600 },
          h3: { fontFamily: "var(--font-display), 'Times New Roman', serif", fontWeight: 600 },
          h4: { fontFamily: "var(--font-display), 'Times New Roman', serif", fontWeight: 600 },
          h5: { fontFamily: "var(--font-display), 'Times New Roman', serif", fontWeight: 600 },
          h6: { fontFamily: "var(--font-display), 'Times New Roman', serif", fontWeight: 600 },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: 'rgba(250, 252, 255, 0.72)',
                backdropFilter: 'blur(10px)',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                border: '1px solid rgba(156, 174, 193, 0.34)',
                backgroundColor: 'rgba(255, 255, 255, 0.68)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 10px 30px rgba(16, 28, 45, 0.08)',
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                backgroundColor: 'rgba(255, 255, 255, 0.56)',
              },
            },
          },
        },
      }),
    [],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
