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
          primary: { main: '#0f172a' },
          secondary: { main: '#0ea5e9' },
          background: { default: '#f8fafc', paper: '#ffffff' },
        },
        shape: { borderRadius: 12 },
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
