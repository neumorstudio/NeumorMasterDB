#!/usr/bin/env python3
"""UI premium + usable para explorar negocios y servicios guardados en Supabase."""

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
    ("Relevancia (Negocio A-Z)", "business_name.asc,service_name.asc"),
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
VIEW_MODE_OPTIONS = ["Tarjetas", "Tabla"]
CARD_SCOPE_OPTIONS = ["Negocios", "Servicios"]

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
    "f_view_mode": VIEW_MODE_OPTIONS[0],
    "f_card_scope": CARD_SCOPE_OPTIONS[0],  # Negocios por defecto
    "page": 1,
}


def inject_styles() -> None:
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap');

        html, body, [class*="css"], [data-testid="stMarkdownContainer"] p {
          font-family: "Manrope", sans-serif !important;
        }
        h1, h2, h3 {
          font-family: "Playfair Display", serif !important;
          letter-spacing: .01em;
        }
        [data-testid="stAppViewContainer"] {
          background:
            radial-gradient(950px 420px at 0% -10%, rgba(201, 168, 106, .12), transparent 60%),
            radial-gradient(1100px 520px at 100% -20%, rgba(64, 98, 181, .16), transparent 62%),
            linear-gradient(180deg, #0B0E14 0%, #0A1018 100%);
        }
        [data-testid="stSidebar"] > div:first-child {
          background: linear-gradient(180deg, #0E1421 0%, #0C111B 100%);
        }
        .block-container {
          max-width: 1320px;
          padding-top: 1.2rem;
          padding-bottom: 2rem;
        }
        .hero-shell {
          border: 1px solid #2A3345;
          border-radius: 18px;
          background: linear-gradient(125deg, rgba(18, 24, 36, .88), rgba(13, 19, 31, .72));
          box-shadow: 0 16px 42px rgba(0, 0, 0, 0.30);
          padding: 1.25rem 1.35rem;
          margin-bottom: 1rem;
        }
        .hero-kicker {
          text-transform: uppercase;
          letter-spacing: .12em;
          color: #C9A86A;
          font-weight: 700;
          font-size: .74rem;
        }
        .hero-title {
          margin: .35rem 0 .45rem 0;
          font-size: clamp(1.55rem, 2.8vw, 2.35rem);
          line-height: 1.1;
          color: #F4F7FF;
        }
        .hero-sub {
          color: #AEB9CF;
          font-size: .98rem;
          max-width: 860px;
          line-height: 1.5;
        }
        .panel-shell {
          border: 1px solid #2A3345;
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(16, 23, 35, .72), rgba(14, 20, 31, .72));
          padding: 1rem 1rem .8rem 1rem;
          margin: .65rem 0 1rem 0;
        }
        .section-kicker {
          text-transform: uppercase;
          letter-spacing: .11em;
          color: #8D9FBE;
          font-weight: 700;
          font-size: .72rem;
          margin-bottom: .25rem;
        }
        .chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: .42rem;
          margin-top: .35rem;
        }
        .chip {
          border-radius: 999px;
          padding: .2rem .62rem;
          border: 1px solid rgba(166, 183, 216, .30);
          background: rgba(174, 185, 207, .10);
          color: #D9E4FB;
          font-size: .78rem;
        }
        .card-shell {
          border: 1px solid #2A3345;
          border-radius: 14px;
          background: linear-gradient(160deg, rgba(17, 24, 37, .95), rgba(13, 18, 29, .95));
          box-shadow: 0 10px 28px rgba(0, 0, 0, .20);
          padding: .85rem .9rem;
          margin-bottom: .72rem;
          min-height: 170px;
        }
        .card-title {
          margin: 0;
          color: #F6F8FF;
          font-size: .98rem;
          line-height: 1.3;
          font-weight: 700;
        }
        .card-sub {
          margin: .3rem 0 .45rem 0;
          color: #B9C6DF;
          font-size: .83rem;
        }
        .card-meta {
          color: #DCE6FA;
          font-size: .82rem;
          margin-top: .24rem;
        }
        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: .35rem;
          margin-top: .52rem;
        }
        .card-tag {
          font-size: .74rem;
          color: #C5D4F0;
          border: 1px solid rgba(95, 123, 177, .45);
          background: rgba(86, 116, 173, .13);
          border-radius: 999px;
          padding: .15rem .5rem;
        }
        [data-testid="stMetric"] {
          border: 1px solid #2A3345;
          border-radius: 14px;
          background: linear-gradient(160deg, rgba(18, 25, 38, .72), rgba(13, 18, 29, .72));
          padding: .58rem .7rem;
        }
        [data-testid="stMetricLabel"] p {
          font-weight: 600;
          color: #9DB0D3;
        }
        [data-testid="stMetricValue"] {
          color: #F6F8FF;
          font-weight: 750;
        }
        .stButton > button, .stDownloadButton > button {
          font-weight: 650;
          border-width: 1px;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def init_state() -> None:
    for key, value in DEFAULT_STATE.items():
        if key not in st.session_state:
            st.session_state[key] = value
    if st.session_state.get("f_view_mode") not in VIEW_MODE_OPTIONS:
        st.session_state["f_view_mode"] = VIEW_MODE_OPTIONS[0]
    if st.session_state.get("f_card_scope") not in CARD_SCOPE_OPTIONS:
        st.session_state["f_card_scope"] = CARD_SCOPE_OPTIONS[0]
    valid_sort_labels = {label for label, _ in SORT_OPTIONS}
    if st.session_state.get("f_sort_label") not in valid_sort_labels:
        st.session_state["f_sort_label"] = SORT_OPTIONS[0][0]
    if "last_filter_signature" not in st.session_state:
        st.session_state["last_filter_signature"] = None


def reset_filters() -> None:
    for key, value in DEFAULT_STATE.items():
        st.session_state[key] = value
    st.session_state["last_filter_signature"] = None
    clear_selected_details()


def clear_selected_details() -> None:
    st.session_state.pop("selected_service_detail", None)
    st.session_state.pop("selected_business_detail", None)


def read_setting(name: str) -> str:
    value = os.getenv(name, "").strip()
    if value:
        return value
    try:
        secret_value = st.secrets.get(name, "")
        if isinstance(secret_value, str):
            return secret_value.strip()
    except Exception:  # noqa: BLE001
        return ""
    return ""


@st.cache_data(ttl=180)
def fetch_reference_data(base_url: str, api_key: str) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    headers = {"apikey": api_key, "Authorization": f"Bearer {api_key}"}
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
        params.append(("city", f"ilike.*{city_like.strip().replace(',', ' ')}*"))
    if region_like.strip():
        params.append(("region", f"ilike.*{region_like.strip().replace(',', ' ')}*"))
    if business_types:
        params.append(("business_type_code", f"in.({','.join(business_types)})"))
    if categories:
        params.append(("service_category_code", f"in.({','.join(categories)})"))
    if price_kinds:
        params.append(("price_kind", f"in.({','.join(price_kinds)})"))
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


def format_service_price(row: dict[str, Any]) -> str:
    currency = row.get("currency_code") or "EUR"
    kind = (row.get("price_kind") or "").lower()
    fixed = row.get("price_cents")
    min_cents = row.get("price_min_cents")
    max_cents = row.get("price_max_cents")

    if kind == "fixed" and isinstance(fixed, int):
        return format_money(fixed, currency)
    if kind == "from" and isinstance(min_cents, int):
        return f"Desde {format_money(min_cents, currency)}"
    if kind == "range" and isinstance(min_cents, int) and isinstance(max_cents, int):
        return f"{format_money(min_cents, currency)} - {format_money(max_cents, currency)}"
    if isinstance(fixed, int):
        return format_money(fixed, currency)
    return "Consultar"


def rows_to_csv(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return ""
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


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


def render_active_chips(items: list[str]) -> None:
    if not items:
        st.caption("Sin filtros activos. Estás viendo todo el catálogo disponible.")
        return
    chips_html = "".join(f"<span class='chip'>{html.escape(item)}</span>" for item in items)
    st.markdown(f"<div class='chip-row'>{chips_html}</div>", unsafe_allow_html=True)


def build_business_cards(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for idx, row in enumerate(rows):
        business_id = str(row.get("business_id") or f"business-{idx}")
        business_name = str(row.get("business_name") or "Negocio sin nombre")
        key = f"{business_id}|{business_name}"

        if key not in grouped:
            grouped[key] = {
                "business_id": row.get("business_id"),
                "business_name": business_name,
                "business_type_label": row.get("business_type_label") or row.get("business_type_code") or "-",
                "country_code": row.get("country_code"),
                "region": row.get("region"),
                "city": row.get("city"),
                "services": [],
                "min_price_cents": None,
                "max_price_cents": None,
                "categories": set(),
            }

        bucket = grouped[key]
        bucket["services"].append(dict(row))
        category_label = row.get("service_category_label") or row.get("service_category_code")
        if category_label:
            bucket["categories"].add(str(category_label))

        price = row.get("price_cents")
        if isinstance(price, int):
            if bucket["min_price_cents"] is None or price < bucket["min_price_cents"]:
                bucket["min_price_cents"] = price
            if bucket["max_price_cents"] is None or price > bucket["max_price_cents"]:
                bucket["max_price_cents"] = price

    businesses = list(grouped.values())
    businesses.sort(key=lambda b: (-(len(b["services"])), str(b["business_name"]).lower()))
    return businesses


def render_service_cards(rows: list[dict[str, Any]]) -> None:
    cols = st.columns(2, gap="medium")
    for idx, row in enumerate(rows):
        service_name = html.escape(str(row.get("service_name") or "Servicio sin nombre"))
        business_name = html.escape(str(row.get("business_name") or "Negocio sin nombre"))
        city = html.escape(str(row.get("city") or "-"))
        region = html.escape(str(row.get("region") or "-"))
        category = html.escape(str(row.get("service_category_label") or row.get("service_category_code") or "Sin categoria"))
        business_type = html.escape(str(row.get("business_type_label") or row.get("business_type_code") or "Sin tipo"))
        duration = f"{row.get('duration_minutes')} min" if row.get("duration_minutes") is not None else "Duracion no informada"
        price_label = html.escape(format_service_price(row))

        card = (
            "<div class='card-shell'>"
            f"<h4 class='card-title'>{service_name}</h4>"
            f"<div class='card-sub'>{business_name}</div>"
            f"<div class='card-meta'><strong>Precio:</strong> {price_label}</div>"
            f"<div class='card-meta'><strong>Duracion:</strong> {html.escape(duration)}</div>"
            f"<div class='card-meta'><strong>Ubicacion:</strong> {city} · {region}</div>"
            "<div class='card-tags'>"
            f"<span class='card-tag'>{category}</span>"
            f"<span class='card-tag'>{business_type}</span>"
            "</div>"
            "</div>"
        )
        with cols[idx % 2]:
            st.markdown(card, unsafe_allow_html=True)
            service_key = str(row.get("service_id") or f"{row.get('business_id') or 'negocio'}-{idx}")
            if st.button("Ver detalle servicio", key=f"detail_service_{service_key}_{idx}", use_container_width=True):
                st.session_state["selected_service_detail"] = dict(row)
                st.session_state.pop("selected_business_detail", None)


def render_business_cards(businesses: list[dict[str, Any]]) -> None:
    cols = st.columns(2, gap="medium")
    for idx, business in enumerate(businesses):
        business_name = html.escape(str(business.get("business_name") or "Negocio sin nombre"))
        business_type = html.escape(str(business.get("business_type_label") or "-"))
        city = html.escape(str(business.get("city") or "-"))
        region = html.escape(str(business.get("region") or "-"))
        total_services = len(business.get("services", []))

        min_price = business.get("min_price_cents")
        max_price = business.get("max_price_cents")
        if isinstance(min_price, int) and isinstance(max_price, int):
            if min_price == max_price:
                price_text = format_money(min_price, "EUR")
            else:
                price_text = f"{format_money(min_price, 'EUR')} - {format_money(max_price, 'EUR')}"
        elif isinstance(min_price, int):
            price_text = f"Desde {format_money(min_price, 'EUR')}"
        else:
            price_text = "Consultar"

        categories = sorted(business.get("categories") or [])
        category_badges = "".join(f"<span class='card-tag'>{html.escape(cat)}</span>" for cat in categories[:3])
        if len(categories) > 3:
            category_badges += f"<span class='card-tag'>+{len(categories)-3} más</span>"

        card = (
            "<div class='card-shell'>"
            f"<h4 class='card-title'>{business_name}</h4>"
            f"<div class='card-sub'>{business_type}</div>"
            f"<div class='card-meta'><strong>Servicios filtrados:</strong> {total_services}</div>"
            f"<div class='card-meta'><strong>Rango de precio:</strong> {html.escape(price_text)}</div>"
            f"<div class='card-meta'><strong>Ubicacion:</strong> {city} · {region}</div>"
            f"<div class='card-tags'>{category_badges or '<span class=\"card-tag\">Sin categoria</span>'}</div>"
            "</div>"
        )

        with cols[idx % 2]:
            st.markdown(card, unsafe_allow_html=True)
            business_key = str(business.get("business_id") or f"business-{idx}")
            if st.button("Ver detalle negocio", key=f"detail_business_{business_key}_{idx}", use_container_width=True):
                st.session_state["selected_business_detail"] = dict(business)
                st.session_state.pop("selected_service_detail", None)


@st.dialog("Detalle del servicio")
def show_service_detail_dialog(row: dict[str, Any]) -> None:
    st.markdown(f"### {row.get('service_name') or 'Servicio sin nombre'}")
    st.caption(row.get("business_name") or "Negocio sin nombre")
    c1, c2 = st.columns(2)
    with c1:
        st.markdown(f"- **Tipo negocio:** {row.get('business_type_label') or row.get('business_type_code') or '-'}")
        st.markdown(f"- **Categoria:** {row.get('service_category_label') or row.get('service_category_code') or '-'}")
        st.markdown(f"- **Precio:** {format_service_price(row)}")
        st.markdown(f"- **Tipo de precio:** {row.get('price_kind') or '-'}")
        st.markdown(f"- **Duracion:** {row.get('duration_minutes') if row.get('duration_minutes') is not None else '-'} min")
    with c2:
        st.markdown(f"- **Pais:** {row.get('country_code') or '-'}")
        st.markdown(f"- **Region:** {row.get('region') or '-'}")
        st.markdown(f"- **Ciudad:** {row.get('city') or '-'}")
        st.markdown(f"- **Business ID:** `{row.get('business_id') or '-'}`")
        st.markdown(f"- **Service ID:** `{row.get('service_id') or '-'}`")

    with st.expander("Ver JSON completo"):
        st.json(row)

    if st.button("Cerrar", use_container_width=True, type="primary"):
        st.session_state.pop("selected_service_detail", None)
        st.rerun()


@st.dialog("Detalle del negocio")
def show_business_detail_dialog(business: dict[str, Any]) -> None:
    st.markdown(f"### {business.get('business_name') or 'Negocio sin nombre'}")
    st.caption(business.get("business_type_label") or "-")
    c1, c2 = st.columns(2)
    with c1:
        st.markdown(f"- **Pais:** {business.get('country_code') or '-'}")
        st.markdown(f"- **Region:** {business.get('region') or '-'}")
        st.markdown(f"- **Ciudad:** {business.get('city') or '-'}")
        st.markdown(f"- **Business ID:** `{business.get('business_id') or '-'}`")
    with c2:
        services = business.get("services", [])
        st.markdown(f"- **Servicios filtrados:** {len(services)}")
        min_price = business.get("min_price_cents")
        max_price = business.get("max_price_cents")
        if isinstance(min_price, int) and isinstance(max_price, int):
            range_text = format_money(min_price, "EUR") if min_price == max_price else f"{format_money(min_price, 'EUR')} - {format_money(max_price, 'EUR')}"
        else:
            range_text = "Consultar"
        st.markdown(f"- **Rango de precio:** {range_text}")
        categories = sorted(list(business.get("categories") or []))
        st.markdown(f"- **Categorias:** {', '.join(categories) if categories else '-'}")

    services = business.get("services", [])
    if services:
        st.markdown("#### Servicios de este negocio (según filtros actuales)")
        service_rows = [
            {
                "Servicio": s.get("service_name"),
                "Categoria": s.get("service_category_label") or s.get("service_category_code"),
                "Precio": format_service_price(s),
                "Duracion": f"{s.get('duration_minutes')} min" if s.get("duration_minutes") is not None else "-",
            }
            for s in services
        ]
        st.dataframe(service_rows, use_container_width=True, hide_index=True)

    with st.expander("Ver JSON completo del negocio"):
        st.json(business)

    if st.button("Cerrar", use_container_width=True, type="primary"):
        st.session_state.pop("selected_business_detail", None)
        st.rerun()


def main() -> None:
    st.set_page_config(
        page_title="Neumor Directory Atelier",
        page_icon="sparkles",
        layout="wide",
        initial_sidebar_state="expanded",
    )
    init_state()
    inject_styles()

    supabase_url = read_setting("SUPABASE_URL")
    api_key = (
        read_setting("SUPABASE_SERVICE_ROLE_KEY")
        or read_setting("SUPABASE_SERVICE_KEY")
        or read_setting("SUPABASE_ANON_KEY")
    )

    with st.sidebar:
        st.markdown("### Neumor Directory")
        st.caption("Panel de control para búsqueda y filtrado.")
        with st.expander("Conexion", expanded=not bool(supabase_url and api_key)):
            supabase_url = st.text_input(
                "SUPABASE_URL",
                value=supabase_url,
                placeholder="https://tu-proyecto.supabase.co",
            )
            api_key = st.text_input(
                "API key",
                value=api_key,
                type="password",
                placeholder="anon o service role",
            )

    if not supabase_url or not api_key:
        st.warning("Configura SUPABASE_URL y API key para continuar.")
        st.stop()

    try:
        business_type_rows, category_rows = fetch_reference_data(supabase_url, api_key)
    except requests.RequestException as exc:
        st.error(f"No se pudo conectar con Supabase: {exc}")
        st.stop()

    bt_options = {row["label"]: row["code"] for row in business_type_rows}
    cat_options = {row["label"]: row["code"] for row in category_rows}
    price_kind_map = {label: code for label, code in PRICE_KIND_OPTIONS}
    sort_map = {label: code for label, code in SORT_OPTIONS}

    with st.sidebar:
        st.markdown("---")
        st.markdown("#### Ajustes de vista")
        st.selectbox("Orden", options=list(sort_map.keys()), key="f_sort_label")
        st.selectbox("Resultados por pagina", options=PAGE_SIZE_OPTIONS, key="f_page_size")
        if st.button("Limpiar todos los filtros", use_container_width=True):
            reset_filters()
            st.rerun()

    st.markdown(
        """
        <div class="hero-shell">
          <div class="hero-kicker">NEUMOR DB · SERVICE DISCOVERY</div>
          <h1 class="hero-title">Buscador inteligente de negocios y servicios</h1>
          <div class="hero-sub">
            Interfaz optimizada para explorar por tarjetas y abrir detalle en modal.
            Por defecto verás tarjetas de negocios para una navegación más clara.
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    with st.form("quick_filters", clear_on_submit=False):
        st.markdown("<div class='panel-shell'>", unsafe_allow_html=True)
        st.markdown("<div class='section-kicker'>Busqueda rapida</div>", unsafe_allow_html=True)
        st.markdown("Empieza con texto + ciudad. Ajusta precio/duracion y pulsa buscar.")

        q1, q2 = st.columns([2, 1])
        with q1:
            st.text_input(
                "Que quieres encontrar?",
                key="f_search",
                placeholder="Ej: maquillaje novia, corte, lifting, cejas...",
            )
        with q2:
            st.text_input("Ciudad", key="f_city", placeholder="Ej: Sevilla")

        q3, q4 = st.columns(2)
        with q3:
            st.slider("Rango de precio (EUR)", min_value=0, max_value=500, step=5, key="f_price_range")
        with q4:
            st.slider("Rango de duracion (min)", min_value=0, max_value=360, step=5, key="f_duration_range")

        with st.expander("Filtros avanzados", expanded=False):
            a_col1, a_col2 = st.columns(2)
            with a_col1:
                st.text_input("Pais (ISO-2)", key="f_country", max_chars=2)
                st.text_input("Region contiene", key="f_region")
                st.multiselect(
                    "Tipo de negocio",
                    options=list(bt_options.keys()),
                    key="f_business_types",
                    placeholder="Todos",
                )
            with a_col2:
                st.multiselect(
                    "Categoria de servicio",
                    options=list(cat_options.keys()),
                    key="f_categories",
                    placeholder="Todas",
                )
                st.multiselect(
                    "Tipo de precio",
                    options=list(price_kind_map.keys()),
                    key="f_price_kinds",
                    placeholder="Todos",
                )

        a1, a2 = st.columns([1, 1])
        a1.form_submit_button("Buscar ahora", use_container_width=True, type="primary")
        clear_quick = a2.form_submit_button("Limpiar búsqueda", use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

    if clear_quick:
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
        clear_selected_details()

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

    unique_businesses = len({row.get("business_id") or row.get("business_name") for row in rows})
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Resultados", f"{total}")
    m2.metric("Página", f"{page}/{total_pages}")
    m3.metric("Filas visibles", f"{len(rows)}")
    m4.metric("Negocios en página", f"{unique_businesses}")

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
    render_active_chips(active)

    if not rows:
        st.markdown("<div class='panel-shell'><h3>Sin resultados para estos filtros</h3></div>", unsafe_allow_html=True)
        c1, c2 = st.columns([1, 2])
        if c1.button("Resetear filtros", type="primary", use_container_width=True):
            reset_filters()
            st.rerun()
        c2.caption("Prueba quitando ciudad, ampliando precio/duracion o cambiando categoria.")
        st.stop()

    view_mode = st.radio(
        "Vista de resultados",
        VIEW_MODE_OPTIONS,
        key="f_view_mode",
        horizontal=True,
    )
    st.caption(f"Modo activo: {view_mode}")

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
                "Precio": format_service_price(row),
                "Duracion": f"{row.get('duration_minutes')} min" if row.get("duration_minutes") is not None else "-",
            }
        )

    if view_mode == "Tarjetas":
        card_scope = st.radio(
            "Mostrar tarjetas de",
            CARD_SCOPE_OPTIONS,
            key="f_card_scope",
            horizontal=True,
        )
        if card_scope == "Negocios":
            render_business_cards(build_business_cards(rows))
        else:
            render_service_cards(rows)
    else:
        st.dataframe(display_rows, use_container_width=True, hide_index=True)

    selected_business_detail = st.session_state.get("selected_business_detail")
    if isinstance(selected_business_detail, dict):
        show_business_detail_dialog(selected_business_detail)

    selected_service_detail = st.session_state.get("selected_service_detail")
    if isinstance(selected_service_detail, dict):
        show_service_detail_dialog(selected_service_detail)

    nav1, nav2, nav3 = st.columns([1, 2, 1])
    if nav1.button("Anterior", disabled=(page <= 1), use_container_width=True):
        st.session_state["page"] = max(1, page - 1)
        clear_selected_details()
        st.rerun()
    nav2.markdown(
        f"<div style='text-align:center;padding-top:.45rem;'>Página <strong>{page}</strong> de <strong>{total_pages}</strong></div>",
        unsafe_allow_html=True,
    )
    if nav3.button("Siguiente", disabled=(page >= total_pages), use_container_width=True):
        st.session_state["page"] = min(total_pages, page + 1)
        clear_selected_details()
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
