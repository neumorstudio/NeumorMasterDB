# Auditoria y Mapa Funcional: Streamlit -> Next.js

## Ubicacion y ejecucion actual (Streamlit)

- App principal: `scripts/supabase_filter_ui.py`
- Documentacion: `scripts/README_UI.md`, `README.md`
- Comando local:
  - `cd scripts`
  - `python3 -m venv .venv && source .venv/bin/activate`
  - `pip install -r ../requirements.txt`
  - `streamlit run supabase_filter_ui.py`

## Inventario funcional Streamlit

- Navegacion/paginas:
  - Single-page app (sin multipage sidebar).
  - Sidebar con tema, conexion Supabase, orden, page size, refresh cache y reset filtros.
- Filtros/inputs:
  - Busqueda textual (`business_name` o `service_name`).
  - Pais ISO-2, ciudad, region.
  - Multi-select de tipo negocio y categoria.
  - Multi-select de tipo precio (`fixed|from|range|quote`).
  - Rango precio y rango duracion.
  - Orden y resultados por pagina.
- Resultados:
  - Vista tarjetas o tabla.
  - Tarjetas por servicios o por negocios agrupados.
  - Paginacion anterior/siguiente.
- Detalle/modales:
  - Modal de detalle de servicio.
  - Modal de detalle de negocio con tabla de servicios filtrados.
- Origen de datos:
  - Supabase REST (`/rest/v1`) sobre `v_service_search`, `business_types`, `service_categories`.
- Caching/estado:
  - `@st.cache_data` para referencias y consultas.
  - `st.session_state` para filtros, pagina, cache de business cards y seleccion de detalle.
- Auth:
  - Lee `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_KEY` o `SUPABASE_ANON_KEY`.
- Assets/estilos:
  - CSS custom inline en Python (`inject_styles`) y tema claro/oscuro.

## Equivalencias Streamlit -> Next.js

- Sidebar + form -> `FilterBar` cliente en `/items`, sincronizado con URL.
- Session state -> `searchParams` + SSR en server component.
- `st.cache_data` -> fetch server-side `cache: no-store` (MVP) y capa central de datos.
- `st.dialog` -> ruta de detalle `/items/[id]` con `ItemDetail`.
- Tabla/tarjetas -> `ResultsView` con modo tabla o cards.
- Paginacion botones -> `Pagination` de MUI con pagina en query param.
- Errores/vacios/loading -> `app/items/error.tsx`, `StatusState`, `app/items/loading.tsx`.

## Riesgos y supuestos

- Riesgo de volumen: modo tarjetas por negocio requiere fetch total para agrupar (como Streamlit).
- Riesgo de modelo: se asume existencia de `v_service_search` y tablas de referencia.
- Riesgo de seguridad: detectado token sensible en `.env.local`; fue neutralizado localmente y debe rotarse.
- Supuesto auth: la app web es de lectura, sin login de usuario final en esta fase.

## Plan por fases

1. Fase 1 (replicar funcionalidad):
   - Crear app `web/` con App Router, rutas `/`, `/items`, `/items/[id]`.
   - Implementar `FilterBar`, `ResultsView`, `Pagination`, `ItemDetail`.
   - Capa de datos unica (`src/lib/data`) y filtros validados (`zod`).
   - SSR en `/items` y query params como fuente de verdad.
2. Fase 2 (pulido premium estable):
   - Accesibilidad basica (labels/focus), loading/error/empty states, responsive.
   - Logging server-side sin PII.
   - Metadata SEO y OpenGraph minima.
   - Tests minimos (filtros, data helpers, componente clave).

## Opciones de origen de datos (si cambia backend)

- Opcion A (recomendada): mantener Supabase REST/view actual.
  - Pros: minimo riesgo y paridad funcional inmediata.
  - Contras: negocio agrupado sigue costoso para datasets grandes.
- Opcion B: mover a endpoint propio/DB query optimizada para cards.
  - Pros: mejor escalado en paginacion por negocio.
  - Contras: mas complejidad y mayor tiempo de migracion.
