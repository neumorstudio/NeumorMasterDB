import {
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { formatMoney, formatServicePrice } from '@/lib/filters/format';
import type { BusinessCard, Filters, ServiceItem } from '@/types/items';

type Props = {
  filters: Filters;
  services: ServiceItem[];
  businesses: BusinessCard[];
};

export function ResultsView({ filters, services, businesses }: Props) {
  if (filters.view === 'table') {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Table size="small" aria-label="tabla resultados">
            <TableHead>
              <TableRow>
                <TableCell>Negocio</TableCell>
                <TableCell>Servicio</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Ciudad</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Detalle</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map((item, idx) => (
                <TableRow key={`${item.service_id ?? 'service'}-${idx}`}>
                  <TableCell>{item.business_name ?? '-'}</TableCell>
                  <TableCell>{item.service_name ?? '-'}</TableCell>
                  <TableCell>{item.service_category_label ?? item.service_category_code ?? '-'}</TableCell>
                  <TableCell>{item.city ?? '-'}</TableCell>
                  <TableCell>{formatServicePrice(item)}</TableCell>
                  <TableCell>
                    {item.service_id ? (
                      <Button component={Link} href={`/items/${item.service_id}`} size="small">
                        Ver
                      </Button>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (filters.scope === 'businesses') {
    return (
      <Stack spacing={2} mt={2}>
        {businesses.map((item, idx) => (
          <Card key={`${item.business_id ?? 'biz'}-${idx}`}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6">{item.business_name}</Typography>
                <Typography color="text.secondary">{item.business_type_label}</Typography>
                <Typography>
                  Servicios: {item.service_count} | Precio:{' '}
                  {item.min_price_cents !== null ? formatMoney(item.min_price_cents) : 'Consultar'}
                  {item.max_price_cents !== null && item.max_price_cents !== item.min_price_cents
                    ? ` - ${formatMoney(item.max_price_cents)}`
                    : ''}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {item.categories.slice(0, 3).map((category) => (
                    <Chip key={category} label={category} size="small" />
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={2} mt={2}>
      {services.map((item, idx) => (
        <Card key={`${item.service_id ?? 'service'}-${idx}`}>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h6">{item.service_name ?? 'Servicio sin nombre'}</Typography>
              <Typography color="text.secondary">{item.business_name ?? 'Negocio sin nombre'}</Typography>
              <Typography>{formatServicePrice(item)}</Typography>
              {item.service_id ? (
                <Button component={Link} href={`/items/${item.service_id}`} sx={{ width: 'fit-content' }}>
                  Ver detalle
                </Button>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

export function ViewModeToggle({ filters }: { filters: Filters }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mt={2}>
      <ToggleButtonGroup value={filters.view} exclusive>
        <ToggleButton value="cards" disabled>
          Tarjetas
        </ToggleButton>
        <ToggleButton value="table" disabled>
          Tabla
        </ToggleButton>
      </ToggleButtonGroup>
      {filters.view === 'cards' ? (
        <ToggleButtonGroup value={filters.scope} exclusive>
          <ToggleButton value="businesses" disabled>
            Negocios
          </ToggleButton>
          <ToggleButton value="services" disabled>
            Servicios
          </ToggleButton>
        </ToggleButtonGroup>
      ) : null}
    </Stack>
  );
}
