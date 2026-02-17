import { Button, Stack } from '@mui/material';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ItemDetail } from '@/components/items/ItemDetail';
import { getServiceById } from '@/lib/data/items';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ItemDetailPage({ params }: Props) {
  const { id } = await params;
  const item = await getServiceById(id);

  if (!item) {
    notFound();
  }

  return (
    <Stack spacing={2}>
      <Button component={Link} href="/items" variant="outlined" sx={{ width: 'fit-content' }}>
        Volver
      </Button>
      <ItemDetail item={item} />
    </Stack>
  );
}
