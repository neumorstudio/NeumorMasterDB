import { Skeleton, Stack } from '@mui/material';

export default function LoadingItems() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={60} />
      <Skeleton variant="rounded" height={180} />
      <Skeleton variant="rounded" height={180} />
    </Stack>
  );
}
