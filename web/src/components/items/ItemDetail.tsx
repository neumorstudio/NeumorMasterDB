import { Card, CardContent, Grid, Typography } from '@mui/material';
import { formatServicePrice } from '@/lib/filters/format';
import type { ServiceItem } from '@/types/items';

export function ItemDetail({ item }: { item: ServiceItem }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h4" component="h1" mb={1}>
          {item.service_name ?? 'Servicio sin nombre'}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" mb={3}>
          {item.business_name ?? 'Negocio sin nombre'}
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography><strong>Precio:</strong> {formatServicePrice(item)}</Typography>
            <Typography><strong>Tipo precio:</strong> {item.price_kind ?? '-'}</Typography>
            <Typography><strong>Duracion:</strong> {item.duration_minutes ?? '-'} min</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography><strong>Pais:</strong> {item.country_code ?? '-'}</Typography>
            <Typography><strong>Region:</strong> {item.region ?? '-'}</Typography>
            <Typography><strong>Ciudad:</strong> {item.city ?? '-'}</Typography>
            <Typography><strong>Service ID:</strong> {item.service_id ?? '-'}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
