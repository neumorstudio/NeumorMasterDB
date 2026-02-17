# Supabase Services Directory (Streamlit)

Interfaz amigable para buscar y filtrar negocios/servicios guardados en Supabase.

## Local

```bash
cd scripts
python3 -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
streamlit run supabase_filter_ui.py
```

## Streamlit Community Cloud

- Main file path: `scripts/supabase_filter_ui.py`
- Requirements: `requirements.txt` (raiz)
- Runtime: `runtime.txt` (Python 3.12)
- Secrets (`.streamlit/secrets.toml` en Cloud):

```toml
SUPABASE_URL = "https://TU-PROYECTO.supabase.co"
SUPABASE_ANON_KEY = "TU_ANON_O_PUBLISHABLE_KEY"
# opcional admin:
# SUPABASE_SERVICE_ROLE_KEY = "TU_SERVICE_ROLE_KEY"
```

## Ingesta automatica por ciudad/codigo postal (Booksy)

Descubre enlaces automaticamente y ejecuta el scraper existente:

```bash
cd scripts
python3 booksy_postal_runner.py
```

Ese comando abre un asistente interactivo (te va preguntando todo paso a paso).
Ahora el flujo pide primero **Ciudad** y luego **Codigo postal (opcional)**.
Si dejas el CP vacio, activa modo **city-wide**:
- busca toda la ciudad,
- detecta codigos de zona presentes,
- y expande resultados por cada codigo detectado.

Tambien puedes usar modo no interactivo:

```bash
cd scripts
python3 booksy_postal_runner.py --postal-code 41001 --city-hint sevilla --dry-run --yes
```

Modo ciudad completa (sin CP):

```bash
python3 booksy_postal_runner.py --city-hint sevilla --postal-code "" --dry-run --yes
```

Si quieres abarcar toda la ciudad (mas resultados), usa:

```bash
python3 booksy_postal_runner.py --postal-code 41001 --city-hint sevilla --seed-category peluqueria --strategy city_category --dry-run --yes
```

Cuando quieras guardar en Supabase, quita `--dry-run` y pasa credenciales:

```bash
python3 booksy_postal_runner.py \
  --postal-code 41001 \
  --city-hint sevilla \
  --supabase-url "$SUPABASE_URL" \
  --supabase-service-key "$SUPABASE_SERVICE_ROLE_KEY" \
  --yes
```

Nota sobre precios:
- Si un servicio no trae precio en Booksy, ahora se guarda igualmente.
- En Supabase queda con `price_cents = NULL` y `price_kind = 'quote'`.
