# UI de busqueda/filtros Supabase

## Ejecutar en local

```bash
cd /home/mate0s/Documentos/NeumorStudio/ValenBimbatti/scripts
python3 -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
streamlit run supabase_filter_ui.py
```

## Variables de entorno (opcional)

```bash
export SUPABASE_URL="https://TU-PROYECTO.supabase.co"
export SUPABASE_ANON_KEY="TU_ANON_O_PUBLISHABLE_KEY"
# Opcional admin:
# export SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
```

## Deploy en Streamlit Community Cloud

1. Sube esta carpeta a un repositorio en GitHub.
2. Ve a `share.streamlit.io` y conecta el repo.
3. Configura:
   - Branch: `main`
   - Main file path: `scripts/supabase_filter_ui.py`
4. En `Advanced settings -> Secrets`, pega:

```toml
SUPABASE_URL = "https://TU-PROYECTO.supabase.co"
SUPABASE_ANON_KEY = "TU_ANON_O_PUBLISHABLE_KEY"
```

5. Deploy.

La interfaz mantiene filtros por texto, negocio, categoria, pais, region, ciudad, precio, duracion, tipo de precio, orden y paginacion.
