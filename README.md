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
