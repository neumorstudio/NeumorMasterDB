#!/usr/bin/env python3
"""Interfaz moderna y amigable para buscar negocios/servicios en Supabase."""

from __future__ import annotations

import csv
import html
import io
import math
import os
from typing import Any

import requests
import streamlit as st

PAGE_SIZE_OPTIONS = [25, 50, 100, 200]
SORT_OPTIONS: list[tuple[str, str]] = [
    ("Negocio (A-Z)", "business_name.asc,service_name.asc"),
    ("Precio: menor a mayor", "price_cents.asc.nullslast,service_name.asc"),
    ("Precio: mayor a menor", "price_cents.desc.nullslast,service_name.asc"),
    ("Duracion: corta a larga", "duration_minutes.asc.nullslast,service_name.asc"),
    ("Duracion: larga a corta", "duration_minutes.desc.nullslast,service_name.asc"),
]
PRICE_KIND_OPTIONS: list[tuple[str, str]] = [
    ("Precio fijo", "fixed"),
    ("Desde", "from"),
    ("Rango", "range"),
    ("Consultar", "quote"),
]

DEFAULT_STATE: dict[str, Any] = {
    "f_search": "",
    "f_country": "ES",
    "f_city": "",
    "f_region": "",
    "f_business_types": [],
    "f_categories": [],
    "f_price_kinds": [],
    "f_price_range": (0, 250),
    "f_duration_range": (0, 240),
    "f_sort_label": SORT_OPTIONS[0][0],
    "f_page_size": PAGE_SIZE_OPTIONS[0],
    "f_view_mode": "Tabla",
    "page": 1,
}


def inject_styles() -> None:
    st.markdown(
        """
        <style>
        :root {
          --surface: rgba(14, 18, 26, 0.72);
          --surface-strong: rgba(16, 22, 34, 0.86);
          --text-strong: #f4f7ff;
          --text-soft: #b5bfd3;
          --accent: #5de2ff;
          --accent-2: #86ffa8;
          --border: rgba(118, 138, 170, 0.28);
        }
        [data-testid="stAppViewContainer"] {
          background:
            radial-gradient(1000px 460px at -10% -10%, rgba(56, 160, 255, 0.22), transparent 60%),
            radial-gradient(900px 380px at 110% -20%, rgba(110, 84, 250, 0.20), transparent 58%),
            linear-gradient(180deg, #090c12 0%, #0b1018 42%, #090d14 100%);
          color: var(--text-strong);
        }
        [data-testid="stSidebar"] > div:first-child {
          background: linear-gradient(180deg, rgba(10, 14, 22, 0.95), rgba(9, 12, 20, 0.93));
          border-right: 1px solid var(--border);
        }
        .block-container {
          padding-top: 1.2rem;
          padding-bottom: 2.25rem;
          max-width: 1320px;
        }
        .hero-shell {
          background: linear-gradient(135deg, rgba(16, 22, 36, 0.88), rgba(13, 18, 30, 0.68));
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 1.05rem 1.2rem 1.15rem 1.2rem;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.30);
          margin-bottom: 1rem;
        }
        .hero-kicker {
          color: var(--accent);
          letter-spacing: .09em;
          text-transform: uppercase;
          font-size: .72rem;
          font-weight: 700;
          margin-bottom: .2rem;
        }
        .hero-title {
          margin: 0;
          font-size: clamp(1.45rem, 2.2vw, 2.1rem);
          line-height: 1.1;
          font-weight: 700;
          color: var(--text-strong);
        }
        .hero-sub {
          margin-top: .45rem;
          color: var(--text-soft);
          font-size: .96rem;
          max-width: 760px;
        }
        .badge-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: .42rem;
          margin: .35rem 0 .1rem 0;
        }
        .badge-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: rgba(93, 226, 255, 0.12);
          border: 1px solid rgba(93, 226, 255, 0.28);
          color: #d9f6ff;
          font-size: .78rem;
          padding: .18rem .58rem;
          line-height: 1.1;
        }
        .business-card {
          border-radius: 16px;
          border: 1px solid var(--border);
          background: linear-gradient(160deg, var(--surface-strong), rgba(12, 17, 27, 0.85));
          padding: .86rem .88rem .84rem .88rem;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.23);
          min-height: 130px;
        }
        .business-card h4 {
          margin: 0;
          color: #f2f5ff;
          font-size: .98rem;
          line-height: 1.2;
        }
        .business-meta {
          margin-top: .4rem;
          color: var(--text-soft);
          font-size: .79rem;
        }
        .business-kpi {
          margin-top: .48rem;
          color: #e5ebff;
          font-size: .82rem;
        }
        .filters-hint {
          margin: .18rem 0 0.55rem 0;
          font-size: .86rem;
          color: var(--text-soft);
        }
        [data-testid="stMetric"] {
          background: linear-gradient(150deg, rgba(16, 22, 34, 0.78), rgba(12, 17, 27, 0.72));
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: .56rem .72rem;
        }
        [data-testid="stMetricLabel"] p {
          color: var(--text-soft);
          font-weight: 600;
          letter-spacing: .01em;
        }
        [data-testid="stMetricValue"] {
          color: #f6f8ff;
          font-weight: 700;
        }
        .stButton > button {
          border-radius: 12px;
          border: 1px solid rgba(120, 143, 180, 0.44);
          background: linear-gradient(180deg, rgba(19, 27, 41, 0.92), rgba(13, 19, 30, 0.94));
          color: #eef3ff;
          font-weight: 600;
        }
        .stDownloadButton > button {
          border-radius: 12px;
          border: 1px solid rgba(120, 143, 180, 0.44);
        }
        [data-testid="stDataFrame"] {
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def init_state() -> None:
    for key, value in DEFAULT_STATE.items():
        if key not in st.session_state:
            st.session_state[key] = value
    if "last_filter_signature" not in st.session_state:
        st.session_state["last_filter_signature"] = None


def reset_filters() -> None:
    for key, value in DEFAULT_STATE.items():
        st.session_state[key] = value
    st.session_state["last_filter_signature"] = None


def active_filters_summary(
    *,
    search: str,
    country_code: str,
    city_like: str,
    region_like: str,
    business_type_labels: list[str],
    category_labels: list[str],
    price_kind_labels: list[str],
    price_range: tuple[int, int],
    duration_range: tuple[int, int],
) -> list[str]:
    items: list[str] = []
    if search:
        items.append(f"Busqueda: {search}")
    if country_code and country_code.upper() != "ES":
        items.append(f"Pais: {country_code.upper()}")
    if city_like:
        items.append(f"Ciudad: {city_like}")
    if region_like:
        items.append(f"Region: {region_like}")
    if business_type_labels:
        items.append(f"Tipo: {', '.join(business_type_labels)}")
    if category_labels:
        items.append(f"Categoria: {', '.join(category_labels)}")
    if price_kind_labels:
        items.append(f"Precio: {', '.join(price_kind_labels)}")
    if price_range != DEFAULT_STATE["f_price_range"]:
        items.append(f"EUR: {price_range[0]}-{price_range[1]}")
    if duration_range != DEFAULT_STATE["f_duration_range"]:
        items.append(f"Duracion: {duration_range[0]}-{duration_range[1]} min")
    return items


def render_active_badges(items: list[str]) -> None:
    if not items:
        st.caption("Sin filtros activos. Estás viendo todos los datos disponibles.")
        return
    html_badges = "".join(f"<span class='badge-pill'>{html.escape(item)}</span>" for item in items)
    st.markdown(f"<div class='badge-wrap'>{html_badges}</div>", unsafe_allow_html=True)


@st.cache_data(ttl=120)
def fetch_reference_data(base_url: str, api_key: str) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
    }
    bt_resp = requests.get(
        f"{base_url}/rest/v1/business_types",
        headers=headers,
        params={"select": "code,label", "order": "label.asc"},
        timeout=20,
    )
    bt_resp.raise_for_status()

    sc_resp = requests.get(
        f"{base_url}/rest/v1/service_categories",
        headers=headers,
        params={"select": "code,label", "order": "label.asc"},
        timeout=20,
    )
    sc_resp.raise_for_status()

    return bt_resp.json(), sc_resp.json()


def build_filters(
    search: str,
    country_code: str,
    city_like: str,
    region_like: str,
    business_types: list[str],
    categories: list[str],
    price_kinds: list[str],
    min_price: int | None,
    max_price: int | None,
    min_duration: int | None,
    max_duration: int | None,
    sort_order: str,
) -> list[tuple[str, str]]:
    params: list[tuple[str, str]] = [
        (
            "select",
            "service_id,business_id,business_name,business_type_code,business_type_label,country_code,region,city,service_name,service_category_code,service_category_label,price_kind,currency_code,price_cents,price_min_cents,price_max_cents,duration_minutes",
        ),
        ("order", sort_order),
    ]

    if search.strip():
        q = search.strip().replace(",", " ")
        params.append(("or", f"(business_name.ilike.*{q}*,service_name.ilike.*{q}*)"))

    if country_code.strip():
        params.append(("country_code", f"eq.{country_code.strip().upper()}"))

    if city_like.strip():
        city = city_like.strip().replace(",", " ")
        params.append(("city", f"ilike.*{city}*"))

    if region_like.strip():
        region = region_like.strip().replace(",", " ")
        params.append(("region", f"ilike.*{region}*"))

    if business_types:
        joined = ",".join(business_types)
        params.append(("business_type_code", f"in.({joined})"))

    if categories:
        joined = ",".join(categories)
        params.append(("service_category_code", f"in.({joined})"))

    if price_kinds:
        joined = ",".join(price_kinds)
        params.append(("price_kind", f"in.({joined})"))

    if min_price is not None:
        params.append(("price_cents", f"gte.{min_price}"))
    if max_price is not None:
        params.append(("price_cents", f"lte.{max_price}"))

    if min_duration is not None:
        params.append(("duration_minutes", f"gte.{min_duration}"))
    if max_duration is not None:
        params.append(("duration_minutes", f"lte.{max_duration}"))

    return params


def fetch_rows(
    base_url: str,
    api_key: str,
    params: list[tuple[str, str]],
    page: int,
    page_size: int,
) -> tuple[list[dict[str, Any]], int]:
    from_row = max(0, (page - 1) * page_size)
    to_row = from_row + page_size - 1

    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Prefer": "count=exact",
        "Range-Unit": "items",
        "Range": f"{from_row}-{to_row}",
    }

    resp = requests.get(
        f"{base_url}/rest/v1/v_service_search",
        headers=headers,
        params=params,
        timeout=30,
    )
    resp.raise_for_status()

    total = 0
    content_range = resp.headers.get("Content-Range", "")
    if "/" in content_range:
        try:
            total = int(content_range.rsplit("/", 1)[1])
        except ValueError:
            total = 0

    return resp.json(), total


def format_money(cents: int | None, currency: str = "EUR") -> str:
    if cents is None:
        return "-"
    value = cents / 100
    symbol = "EUR" if currency == "EUR" else currency
    return f"{value:,.2f} {symbol}".replace(",", "X").replace(".", ",").replace("X", ".")


def rows_to_csv(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return ""
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def read_setting(name: str) -> str:
    value = os.getenv(name, "").strip()
    if value:
        return value
    try:
        secret_value = st.secrets.get(name, "")
        if isinstance(secret_value, str):
            return secret_value.strip()
    except Exception:  # noqa: BLE001 - st.secrets puede no existir localmente
        return ""
    return ""


def build_business_summary(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    summary: dict[str, dict[str, Any]] = {}
    for row in rows:
        business_key = row.get("business_id") or row.get("business_name") or "sin-id"
        if business_key not in summary:
            summary[business_key] = {
                "business_name": row.get("business_name") or "Sin nombre",
                "business_type_label": row.get("business_type_label") or row.get("business_type_code") or "-",
                "city": row.get("city") or "-",
                "service_count": 0,
                "min_price_cents": None,
            }
        summary_row = summary[business_key]
        summary_row["service_count"] += 1
        price_cents = row.get("price_cents")
        if isinstance(price_cents, int):
            current_min = summary_row["min_price_cents"]
            if current_min is None or price_cents < current_min:
                summary_row["min_price_cents"] = price_cents

    ordered = sorted(
        summary.values(),
        key=lambda item: (-item["service_count"], str(item["business_name"]).lower()),
    )
    return ordered


def render_business_cards(summary_rows: list[dict[str, Any]], *, max_cards: int = 6) -> None:
    if not summary_rows:
        return
    st.markdown("#### Negocios destacados en esta pagina")
    cols = st.columns(3)
    for idx, item in enumerate(summary_rows[:max_cards]):
        price_label = (
            format_money(item["min_price_cents"], "EUR")
            if isinstance(item["min_price_cents"], int)
            else "Consultar"
        )
        card_html = (
            "<div class='business-card'>"
            f"<h4>{html.escape(str(item['business_name']))}</h4>"
            f"<div class='business-meta'>{html.escape(str(item['business_type_label']))} · "
            f"{html.escape(str(item['city']))}</div>"
            f"<div class='business-kpi'>Servicios visibles: <strong>{item['service_count']}</strong></div>"
            f"<div class='business-kpi'>Desde: <strong>{html.escape(price_label)}</strong></div>"
            "</div>"
        )
        with cols[idx % 3]:
            st.markdown(card_html, unsafe_allow_html=True)


def main() -> None:
    st.set_page_config(page_title="Directorio Supabase", page_icon="search", layout="wide")
    init_state()
    inject_styles()

    st.markdown(
        """
        <div class="hero-shell">
          <div class="hero-kicker">Supabase Explorer</div>
          <h1 class="hero-title">Buscador de negocios y servicios</h1>
          <div class="hero-sub">
            Interfaz simple para filtrar por ciudad, precio, duracion y categorias.
            Mantiene toda la potencia de filtros, pero con una experiencia mas clara para uso diario.
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    supabase_url = read_setting("SUPABASE_URL")
    api_key = (
        read_setting("SUPABASE_SERVICE_ROLE_KEY")
        or read_setting("SUPABASE_SERVICE_KEY")
        or read_setting("SUPABASE_ANON_KEY")
    )

    with st.sidebar:
        st.subheader("Conexion")
        st.caption("Usa anon key para lectura, service role para gestion completa.")
        supabase_url = st.text_input("SUPABASE_URL", value=supabase_url, placeholder="https://tu-proyecto.supabase.co")
        api_key = st.text_input("API key", value=api_key, type="password", placeholder="sb_secret_... o anon...")
        st.markdown("---")
        st.caption("Consejo: guarda estas variables en Secrets para no escribirlas cada vez.")

    if not supabase_url or not api_key:
        st.warning("Configura SUPABASE_URL y API key para consultar los datos.")
        st.stop()

    try:
        business_type_rows, category_rows = fetch_reference_data(supabase_url, api_key)
    except requests.RequestException as exc:
        st.error(f"Error conectando con Supabase: {exc}")
        st.stop()

    bt_options = {row["label"]: row["code"] for row in business_type_rows}
    cat_options = {row["label"]: row["code"] for row in category_rows}
    price_kind_map = {label: code for label, code in PRICE_KIND_OPTIONS}
    sort_map = {label: code for label, code in SORT_OPTIONS}

    with st.expander("Como usarlo en 20 segundos", expanded=False):
        st.markdown(
            "- Escribe texto libre: negocio o servicio.\n"
            "- Ajusta precio y duracion si necesitas afinar.\n"
            "- Usa filtros avanzados solo cuando haga falta.\n"
            "- Exporta CSV de la pagina actual con un clic."
        )

    with st.form("filters_form", clear_on_submit=False):
        st.subheader("Busqueda rapida")
        st.markdown(
            "<div class='filters-hint'>Empieza por texto y ciudad. Luego ajusta precio o duracion.</div>",
            unsafe_allow_html=True,
        )

        c1, c2 = st.columns([2, 1])
        with c1:
            st.text_input(
                "Que quieres encontrar?",
                key="f_search",
                placeholder="Ej: maquillaje novia, corte hombre, semipermanente, lifting...",
            )
        with c2:
            st.text_input(
                "Ciudad",
                key="f_city",
                placeholder="Ej: Sevilla",
            )

        c3, c4 = st.columns(2)
        with c3:
            st.slider(
                "Rango de precio (EUR)",
                min_value=0,
                max_value=500,
                key="f_price_range",
                step=5,
            )
        with c4:
            st.slider(
                "Rango de duracion (min)",
                min_value=0,
                max_value=360,
                key="f_duration_range",
                step=5,
            )

        with st.expander("Filtros avanzados", expanded=False):
            c5, c6 = st.columns(2)
            with c5:
                st.text_input("Pais (ISO-2)", key="f_country", max_chars=2)
                st.text_input("Region contiene", key="f_region")
                st.multiselect(
                    "Tipo de negocio",
                    options=list(bt_options.keys()),
                    key="f_business_types",
                    placeholder="Selecciona uno o varios tipos",
                )
            with c6:
                st.multiselect(
                    "Categoria de servicio",
                    options=list(cat_options.keys()),
                    key="f_categories",
                    placeholder="Selecciona una o varias categorias",
                )
                st.multiselect(
                    "Tipo de precio",
                    options=list(price_kind_map.keys()),
                    key="f_price_kinds",
                    placeholder="Selecciona uno o varios tipos",
                )

            c7, c8 = st.columns(2)
            with c7:
                st.selectbox(
                    "Orden de resultados",
                    options=list(sort_map.keys()),
                    key="f_sort_label",
                )
            with c8:
                st.selectbox(
                    "Resultados por pagina",
                    options=PAGE_SIZE_OPTIONS,
                    key="f_page_size",
                )

        action_col1, action_col2 = st.columns([1, 1])
        action_col1.form_submit_button("Buscar", use_container_width=True, type="primary")
        clear_filters = action_col2.form_submit_button("Limpiar filtros", use_container_width=True)

    if clear_filters:
        reset_filters()
        st.rerun()

    filter_signature = (
        st.session_state["f_search"].strip(),
        st.session_state["f_country"].strip().upper(),
        st.session_state["f_city"].strip(),
        st.session_state["f_region"].strip(),
        tuple(sorted(st.session_state["f_business_types"])),
        tuple(sorted(st.session_state["f_categories"])),
        tuple(sorted(st.session_state["f_price_kinds"])),
        tuple(st.session_state["f_price_range"]),
        tuple(st.session_state["f_duration_range"]),
        st.session_state["f_sort_label"],
        st.session_state["f_page_size"],
    )
    if filter_signature != st.session_state["last_filter_signature"]:
        st.session_state["page"] = 1
        st.session_state["last_filter_signature"] = filter_signature

    params = build_filters(
        search=st.session_state["f_search"],
        country_code=st.session_state["f_country"],
        city_like=st.session_state["f_city"],
        region_like=st.session_state["f_region"],
        business_types=[bt_options[label] for label in st.session_state["f_business_types"]],
        categories=[cat_options[label] for label in st.session_state["f_categories"]],
        price_kinds=[price_kind_map[label] for label in st.session_state["f_price_kinds"]],
        min_price=int(st.session_state["f_price_range"][0] * 100) if st.session_state["f_price_range"][0] > 0 else None,
        max_price=int(st.session_state["f_price_range"][1] * 100) if st.session_state["f_price_range"][1] > 0 else None,
        min_duration=st.session_state["f_duration_range"][0] if st.session_state["f_duration_range"][0] > 0 else None,
        max_duration=st.session_state["f_duration_range"][1] if st.session_state["f_duration_range"][1] > 0 else None,
        sort_order=sort_map[st.session_state["f_sort_label"]],
    )
    page_size = int(st.session_state["f_page_size"])
    page = int(st.session_state["page"])

    try:
        rows, total = fetch_rows(
            base_url=supabase_url,
            api_key=api_key,
            params=params,
            page=page,
            page_size=page_size,
        )
    except requests.RequestException as exc:
        st.error(f"Error consultando v_service_search: {exc}")
        st.stop()

    total_pages = max(1, math.ceil(total / page_size)) if page_size > 0 else 1
    if page > total_pages:
        st.session_state["page"] = total_pages
        page = total_pages

    unique_businesses = len({(row.get("business_id") or row.get("business_name")) for row in rows})
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Resultados totales", f"{total}")
    col2.metric("Pagina", f"{page}/{total_pages}")
    col3.metric("Filas en pagina", f"{len(rows)}")
    col4.metric("Negocios en pagina", f"{unique_businesses}")

    active = active_filters_summary(
        search=st.session_state["f_search"].strip(),
        country_code=st.session_state["f_country"].strip(),
        city_like=st.session_state["f_city"].strip(),
        region_like=st.session_state["f_region"].strip(),
        business_type_labels=st.session_state["f_business_types"],
        category_labels=st.session_state["f_categories"],
        price_kind_labels=st.session_state["f_price_kinds"],
        price_range=tuple(st.session_state["f_price_range"]),
        duration_range=tuple(st.session_state["f_duration_range"]),
    )
    render_active_badges(active)

    display_rows: list[dict[str, Any]] = []
    for row in rows:
        display_rows.append(
            {
                "Negocio": row.get("business_name"),
                "Tipo": row.get("business_type_label") or row.get("business_type_code"),
                "Servicio": row.get("service_name"),
                "Categoria": row.get("service_category_label") or row.get("service_category_code"),
                "Ciudad": row.get("city"),
                "Pais": row.get("country_code"),
                "Precio": format_money(row.get("price_cents"), row.get("currency_code") or "EUR"),
                "Duracion": f"{row.get('duration_minutes')} min" if row.get("duration_minutes") else "-",
            }
        )

    if not display_rows:
        st.info("No hay resultados con esos filtros. Prueba ampliar precio, duracion o quitar algun filtro.")
    else:
        view_col1, view_col2 = st.columns([1, 2])
        with view_col1:
            st.radio("Vista", ["Tabla", "Resumen + tabla"], key="f_view_mode", horizontal=True)
        with view_col2:
            st.caption("Tip: usa 'Resumen + tabla' para explorar rapido y luego bajar al detalle.")

        if st.session_state["f_view_mode"] == "Resumen + tabla":
            summary_rows = build_business_summary(rows)
            render_business_cards(summary_rows)
            st.markdown("")

        st.dataframe(display_rows, use_container_width=True, hide_index=True)

    nav_col1, nav_col2, nav_col3 = st.columns([1, 2, 1])
    prev_disabled = page <= 1
    next_disabled = page >= total_pages
    if nav_col1.button("Anterior", disabled=prev_disabled, use_container_width=True):
        st.session_state["page"] = max(1, page - 1)
        st.rerun()
    nav_col2.markdown(
        f"<div style='text-align:center;padding-top:0.35rem;'>Pagina <strong>{page}</strong> de <strong>{total_pages}</strong></div>",
        unsafe_allow_html=True,
    )
    if nav_col3.button("Siguiente", disabled=next_disabled, use_container_width=True):
        st.session_state["page"] = min(total_pages, page + 1)
        st.rerun()

    csv_payload = rows_to_csv(rows)
    st.download_button(
        label="Descargar CSV de esta pagina",
        data=csv_payload,
        file_name="supabase_filtered_results.csv",
        mime="text/csv",
        disabled=not bool(rows),
        use_container_width=True,
    )


if __name__ == "__main__":
    main()
