# Neumor Directory Web (Next.js)

Migracion minima viable desde Streamlit a Next.js App Router.

## Stack

- Next.js 15 + TypeScript estricto
- MUI (elegido por velocidad de entrega y mantenibilidad en componentes complejos sin setup adicional)
- Zod para validar filtros en server
- Vitest + Testing Library

## Requisitos

- Node 20+
- Variables en `.env.local` basadas en `.env.example`

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Rutas

- `/`: Home
- `/items`: listado con filtros + paginacion server-driven
- `/items/[id]`: detalle de item
- `/api/items`: endpoint de listado
- `/api/items/[id]`: endpoint de detalle
- `/api/reference`: negocio/categorias

## Arquitectura

- Filtros sincronizados en URL (`searchParams`)
- Render SSR en `/items` usando `listItems()` server-side
- Capa de datos central en `src/lib/data/*`
- Validacion de filtros en `src/lib/filters/schema.ts`
- Observabilidad minima en `src/lib/utils/logger.ts` (sin log de secretos)

## Notas Vercel

- Configura `SUPABASE_URL` y una key en Variables de Entorno del proyecto.
- No exponer service role key al cliente.
- `vercel.json` no es necesario para este setup.

## Migracion BD (telefono)

Para habilitar telefono en tarjetas/filtros debes aplicar:

- `db/migrations/20260217_add_business_phone.sql`

Y asegurarte de que `v_service_search` incluye la columna `business_phone`.
