import { Alert, Button, Stack, Typography } from '@mui/material';

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function StatusState({ title, description, actionLabel, actionHref }: Props) {
  return (
    <Alert severity="info" sx={{ mt: 2 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body2">{description}</Typography>
        {actionLabel && actionHref ? (
          <Button href={actionHref} size="small" variant="outlined" sx={{ width: 'fit-content' }}>
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Alert>
  );
}
