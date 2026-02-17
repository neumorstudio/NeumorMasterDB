import { Card, CardContent, CircularProgress, Skeleton, Stack, Typography } from '@mui/material';

export default function LoadingItems() {
  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={24} />
            <Typography variant="body1">Consultando base de datos...</Typography>
          </Stack>
        </CardContent>
      </Card>
      <Skeleton variant="rounded" height={72} />
      <Skeleton variant="rounded" height={160} />
      <Skeleton variant="rounded" height={160} />
    </Stack>
  );
}
