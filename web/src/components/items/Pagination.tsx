'use client';

import { Pagination as MuiPagination, Stack, Typography } from '@mui/material';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Stack alignItems="center" spacing={1} mt={3}>
      <Typography variant="body2" color="text.secondary">
        Pagina {page} de {totalPages}
      </Typography>
      <MuiPagination
        page={page}
        count={totalPages}
        color="primary"
        onChange={(_, value) => {
          const next = new URLSearchParams(searchParams.toString());
          next.set('page', String(value));
          router.push(`${pathname}?${next.toString()}`);
        }}
      />
    </Stack>
  );
}
