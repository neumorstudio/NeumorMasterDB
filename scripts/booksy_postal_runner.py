#!/usr/bin/env python3
"""Descubre enlaces de Booksy por ciudad/codigo postal y ejecuta el exportador."""

from __future__ import annotations

import argparse
import os
import re
import sys
import unicodedata
import urllib.parse
from collections import Counter
from pathlib import Path

import booksy_services_export as exporter

BASE_URL = "https://booksy.com"
DEFAULT_SEED_CATEGORY = "maquillaje"

BUSINESS_LINK_RE = re.compile(r'href="(/es-es/\d+_[^"#?]+)', re.IGNORECASE)
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.IGNORECASE | re.DOTALL)
COUNT_IN_PAREN_RE = re.compile(r"\((\d{1,6})\)")
LOCATION_TOKEN_RE = re.compile(r"_([0-9]+_[a-z0-9-]+)$", re.IGNORECASE)


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_text = ascii_text.lower().strip()
    ascii_text = re.sub(r"[^a-z0-9\s-]", "", ascii_text)
    ascii_text = re.sub(r"[\s_]+", "-", ascii_text)
    ascii_text = re.sub(r"-+", "-", ascii_text).strip("-")
    return ascii_text or "local"


def normalize_business_url(url: str) -> str:
    absolute = urllib.parse.urljoin(BASE_URL, url)
    parsed = urllib.parse.urlsplit(absolute)
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))


def extract_business_links(page_html: str) -> list[str]:
    links: list[str] = []
    seen: set[str] = set()
    for raw in BUSINESS_LINK_RE.findall(page_html):
        normalized = normalize_business_url(raw)
        if normalized in seen:
            continue
        seen.add(normalized)
        links.append(normalized)
    return links


def extract_results_count(page_html: str) -> int | None:
    match = H1_RE.search(page_html)
    if not match:
        return None
    h1_text = exporter.clean_text(match.group(1))
    count_match = COUNT_IN_PAREN_RE.search(h1_text)
    if not count_match:
        return None
    try:
        return int(count_match.group(1))
    except ValueError:
        return None


def build_paged_url(base_url: str, page: int) -> str:
    if page <= 1:
        return base_url
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}businessesPage={page}"


def discover_links_from_search_url(
    *,
    base_url: str,
    max_links: int,
    verbose: bool,
) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()

    estimated_total: int | None = None
    page = 1
    max_pages = 200

    while page <= max_pages:
        page_url = build_paged_url(base_url, page)
        try:
            page_html = exporter.fetch_html(page_url)
        except Exception as exc:  # noqa: BLE001
            if verbose:
                print(f"[WARN] {page_url} -> {exc}")
            break

        if page == 1:
            estimated_total = extract_results_count(page_html)
            if verbose and estimated_total is not None:
                print(f"[INFO] Resultados estimados por Booksy: {estimated_total}")

        page_links = extract_business_links(page_html)
        added = 0
        for link in page_links:
            if link in seen:
                continue
            seen.add(link)
            found.append(link)
            added += 1
            if max_links > 0 and len(found) >= max_links:
                break

        if verbose:
            print(f"[INFO] Pagina {page}: +{added} enlaces (acumulado {len(found)})")

        if max_links > 0 and len(found) >= max_links:
            break

        if not page_links:
            break

        # Corta cuando alcanzamos (aprox) el total mostrado en cabecera.
        if estimated_total is not None and len(found) >= estimated_total:
            break

        # Seguridad: si no añadió nada nuevo en esta página, no seguimos.
        if added == 0:
            break

        page += 1

    return found


def resolve_location_token_from_query(postal_code: str, city_hint: str, *, verbose: bool) -> tuple[str | None, str]:
    query_text = " ".join(part for part in [postal_code.strip(), city_hint.strip()] if part)
    query_url = f"{BASE_URL}/es-es/s?query={urllib.parse.quote_plus(query_text)}"

    try:
        page_html = exporter.fetch_html(query_url)
    except Exception as exc:  # noqa: BLE001
        if verbose:
            print(f"[WARN] No se pudo resolver location token por query: {exc}")
        return None, query_url

    links = extract_business_links(page_html)
    tokens: list[str] = []
    for link in links:
        match = LOCATION_TOKEN_RE.search(link)
        if match:
            tokens.append(match.group(1))

    if not tokens:
        return None, query_url

    location_token, _count = Counter(tokens).most_common(1)[0]
    return location_token, query_url


def extract_location_token_from_link(link: str) -> str | None:
    match = LOCATION_TOKEN_RE.search(link)
    if not match:
        return None
    return match.group(1)


def extract_location_code(location_token: str) -> str | None:
    numeric_part, _, _city_slug = location_token.partition("_")
    return numeric_part if numeric_part.isdigit() else None


def filter_links_by_city_slug(links: list[str], city_slug: str) -> list[str]:
    if not city_slug:
        return links
    city_suffix = f"_{city_slug}"
    filtered: list[str] = []
    for link in links:
        token = extract_location_token_from_link(link)
        if token and token.lower().endswith(city_suffix):
            filtered.append(link)
    return filtered


def merge_unique(base: list[str], extra: list[str], *, max_links: int = 0) -> list[str]:
    seen = set(base)
    merged = list(base)
    for link in extra:
        if link in seen:
            continue
        seen.add(link)
        merged.append(link)
        if max_links > 0 and len(merged) >= max_links:
            break
    return merged


def discover_city_wide_links(
    *,
    city_hint: str,
    seed_category: str,
    max_links: int,
    verbose: bool,
) -> tuple[list[str], list[str], str]:
    city_slug = slugify(city_hint)
    query_city = city_hint.strip()
    if not query_city:
        return [], [], city_slug

    primary_query_url = f"{BASE_URL}/es-es/s?query={urllib.parse.quote_plus(query_city)}"
    if verbose:
        print("[INFO] Modo city-wide (sin codigo postal).")
        print(f"[INFO] Query principal ciudad: {primary_query_url}")

    links = discover_links_from_search_url(
        base_url=primary_query_url,
        max_links=max_links,
        verbose=verbose,
    )

    # En algunos casos Booksy mezcla resultados cercanos: filtramos por slug de ciudad.
    city_filtered = filter_links_by_city_slug(links, city_slug)
    if city_filtered:
        if verbose:
            print(f"[INFO] Filtro por ciudad '{city_slug}': {len(city_filtered)} enlaces (de {len(links)}).")
        links = city_filtered

    # Descubre "codigos de zona" presentes en los resultados de la ciudad.
    detected_codes: list[str] = []
    seen_codes: set[str] = set()
    for link in links:
        token = extract_location_token_from_link(link)
        if not token:
            continue
        code = extract_location_code(token)
        if not code or code in seen_codes:
            continue
        seen_codes.add(code)
        detected_codes.append(code)

    if verbose and detected_codes:
        print(f"[INFO] Codigos detectados en {city_hint}: {', '.join(detected_codes)}")

    # Expande por codigo+ciudad para capturar enlaces adicionales.
    for code in detected_codes:
        if max_links > 0 and len(links) >= max_links:
            break
        query_text = " ".join(part for part in [seed_category.replace("-", " "), code, city_hint] if part)
        query_url = f"{BASE_URL}/es-es/s?query={urllib.parse.quote_plus(query_text)}"
        if verbose:
            print(f"[INFO] Expansion por codigo {code}: {query_url}")
        extra_links = discover_links_from_search_url(
            base_url=query_url,
            max_links=max_links,
            verbose=False,
        )
        extra_links = filter_links_by_city_slug(extra_links, city_slug) or extra_links
        links = merge_unique(links, extra_links, max_links=max_links)
        if verbose:
            print(f"[INFO] +{len(extra_links)} candidatos, acumulado {len(links)}")

    return links, detected_codes, city_slug


def ask_input(prompt: str, *, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{prompt}{suffix}: ").strip()
    return value or default


def ask_yes_no(prompt: str, *, default: bool = True) -> bool:
    suffix = " [S/n]" if default else " [s/N]"
    value = input(f"{prompt}{suffix}: ").strip().lower()
    if not value:
        return default
    return value in {"s", "si", "y", "yes"}


def ask_int(prompt: str, *, default: int = 0, min_value: int = 0) -> int:
    raw = ask_input(prompt, default=str(default))
    try:
        value = int(raw)
    except ValueError:
        print(f"[WARN] Valor no valido. Se usara {default}.")
        return default
    if value < min_value:
        print(f"[WARN] El minimo permitido es {min_value}. Se usara {min_value}.")
        return min_value
    return value


def normalize_jsonl_input(value: str) -> str:
    lowered = value.strip().lower()
    if lowered in {"", "none", "off", "false", "no"}:
        return ""
    return value.strip()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Descubre enlaces Booksy por ciudad/codigo postal y ejecuta la ingesta automáticamente."
    )
    parser.add_argument("--postal-code", default="", help="Codigo postal (opcional). Si va vacio, usa modo ciudad completa.")
    parser.add_argument("--city-hint", default="", help="Ciudad para la busqueda (ej: Sevilla).")
    parser.add_argument(
        "--seed-category",
        default=DEFAULT_SEED_CATEGORY,
        help=f"Categoria principal (default: {DEFAULT_SEED_CATEGORY}).",
    )
    parser.add_argument(
        "--strategy",
        choices=["postal_query", "city_category"],
        default="postal_query",
        help="postal_query = mas preciso por CP. city_category = mas amplio por ciudad.",
    )
    parser.add_argument("--max-links", type=int, default=0, help="Maximo de enlaces a procesar (0 = sin limite).")
    parser.add_argument("--dry-run", action="store_true", help="Solo descubre enlaces; no ejecuta ingesta.")
    parser.add_argument("--yes", action="store_true", help="No pedir confirmacion interactiva.")
    parser.add_argument("--quiet", action="store_true", help="Reduce logs informativos.")

    parser.add_argument("--csv", default="data/booksy_services.csv", help="Ruta CSV acumulado.")
    parser.add_argument("--jsonl", default="data/booksy_services.jsonl", help="Ruta JSONL (usa '' para desactivar).")

    parser.add_argument(
        "--supabase-url",
        default=os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""),
        help="URL de Supabase (env: SUPABASE_URL).",
    )
    parser.add_argument(
        "--supabase-service-key",
        default=os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY", ""),
        help="Service key de Supabase (env: SUPABASE_SERVICE_ROLE_KEY).",
    )
    parser.add_argument("--supabase-rpc", default="ingest_business_payload", help="Nombre RPC Supabase.")
    parser.add_argument("--source-code", default="booksy", help="source_code para payload.")
    parser.add_argument("--business-type-code", default="makeup_artist", help="business_type_code para payload.")
    parser.add_argument("--country-code", default="ES", help="country_code para payload.")
    parser.add_argument(
        "--city",
        default="",
        help="Ciudad fija para payload de ingesta (si no, el exportador intentara inferir por URL).",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    postal_code = args.postal_code.strip()
    city_hint = args.city_hint.strip()
    seed_category = slugify(args.seed_category)
    strategy = args.strategy
    max_links = args.max_links
    dry_run = args.dry_run
    csv_raw = args.csv
    jsonl_raw = args.jsonl
    city_payload_raw = args.city.strip()
    supabase_url = args.supabase_url.strip() or None
    supabase_service_key = args.supabase_service_key.strip() or None

    full_wizard = len(sys.argv) == 1 and not args.yes and sys.stdin.isatty()
    if full_wizard:
        print("Asistente Booksy -> Supabase")
        print("Pulsa Enter para aceptar el valor entre corchetes.\n")
        print("Guia rapida de campos:")
        print("- Ciudad: campo principal para la busqueda.")
        print("- Codigo postal (opcional): si lo dejas vacio, se busca toda la ciudad.")
        print("- Categoria principal: tipo de servicio base (peluqueria, maquillaje, etc).")
        print("- Estrategia 'postal_query': busca por texto CP+ciudad (mas preciso).")
        print("- Estrategia 'city_category': usa ciudad completa (mas resultados).")
        print("- Dry-run: solo muestra enlaces; no guarda nada.")
        print("- Supabase: si dices que SI, guarda/actualiza en tu base de datos.\n")

        city_hint = ask_input("Ciudad", default=city_hint)
        postal_code = ask_input("Codigo postal (opcional)", default=postal_code)
        seed_category = slugify(
            ask_input(
                "Categoria principal (ej: maquillaje, peluqueria, barberia)",
                default=seed_category or DEFAULT_SEED_CATEGORY,
            )
        )
        strategy_input = ask_input(
            "Estrategia (postal_query o city_category)",
            default=strategy,
        )
        strategy = strategy_input if strategy_input in {"postal_query", "city_category"} else "postal_query"
        max_links = ask_int("Maximo de enlaces a procesar (0 = sin limite)", default=max_links, min_value=0)
        csv_raw = ask_input("Ruta CSV", default=csv_raw)
        jsonl_raw = normalize_jsonl_input(
            ask_input("Ruta JSONL (escribe 'none' para desactivar)", default=jsonl_raw)
        )
        city_payload_raw = ask_input("Ciudad fija para payload (vacío = auto)", default=city_hint)

    if not args.yes:
        if not city_hint:
            city_hint = ask_input("Ciudad", default="")
        if not postal_code:
            postal_code = ask_input("Codigo postal (opcional)", default="")

    if not city_hint:
        parser.error("Debes indicar --city-hint o introducir la ciudad en modo interactivo.")

    links: list[str]
    mode_label: str

    if not postal_code:
        links, detected_codes, city_slug = discover_city_wide_links(
            city_hint=city_hint,
            seed_category=seed_category,
            max_links=max_links,
            verbose=not args.quiet,
        )
        mode_label = f"city='{city_hint}' slug='{city_slug}' codigos={len(detected_codes)}"
    elif strategy == "postal_query":
        query_text = " ".join(
            part for part in [seed_category.replace("-", " "), postal_code, city_hint] if part
        )
        search_url = f"{BASE_URL}/es-es/s?query={urllib.parse.quote_plus(query_text)}"
        if not args.quiet:
            print(f"[INFO] Estrategia postal_query")
            print(f"[INFO] URL de busqueda: {search_url}")
        links = discover_links_from_search_url(base_url=search_url, max_links=max_links, verbose=not args.quiet)
        mode_label = f"query='{query_text}'"
    else:
        location_token, resolver_url = resolve_location_token_from_query(
            postal_code,
            city_hint,
            verbose=not args.quiet,
        )
        if not location_token:
            print(
                "[ERROR] No se pudo resolver la ciudad desde CP+ciudad. "
                "Prueba estrategia postal_query o revisa los datos."
            )
            return 1

        category_url = f"{BASE_URL}/es-es/s/{seed_category}/{location_token}"
        if not args.quiet:
            print(f"[INFO] Estrategia city_category")
            print(f"[INFO] Resolver URL: {resolver_url}")
            print(f"[INFO] Location token resuelto: {location_token}")
            print(f"[INFO] URL categoria: {category_url}")

        links = discover_links_from_search_url(base_url=category_url, max_links=max_links, verbose=not args.quiet)
        mode_label = f"location_token='{location_token}'"

    if not links:
        print("[WARN] No se encontraron enlaces de negocio para esa busqueda.")
        return 1

    print(f"\n[OK] Enlaces unicos detectados: {len(links)} ({mode_label})")
    preview_limit = min(10, len(links))
    for index, link in enumerate(links[:preview_limit], start=1):
        print(f"  {index:02d}. {link}")
    if len(links) > preview_limit:
        print(f"  ... y {len(links) - preview_limit} mas")

    if full_wizard:
        dry_run = ask_yes_no("Solo descubrir enlaces (dry-run)?", default=True)

    if dry_run:
        print("\n[DRY-RUN] No se ejecuta la ingesta.")
        return 0

    if full_wizard:
        use_supabase = ask_yes_no(
            "Guardar tambien en Supabase?",
            default=bool(supabase_url and supabase_service_key),
        )
        if use_supabase:
            supabase_url = ask_input("SUPABASE_URL", default=supabase_url or "")
            if supabase_service_key:
                keep_existing_key = ask_yes_no("Usar key detectada en variables de entorno?", default=True)
                if not keep_existing_key:
                    supabase_service_key = ask_input("SUPABASE_SERVICE_ROLE_KEY")
            else:
                supabase_service_key = ask_input("SUPABASE_SERVICE_ROLE_KEY")
            if not supabase_service_key:
                print("[ERROR] No se proporciono SUPABASE_SERVICE_ROLE_KEY.")
                return 1
        else:
            supabase_url = None
            supabase_service_key = None

        if not ask_yes_no("Continuar con la ingesta ahora?", default=True):
            print("[INFO] Operacion cancelada por usuario.")
            return 0
    elif not args.yes:
        confirmation = ask_input("Continuar con la ingesta? (s/n)", default="s").lower()
        if confirmation not in {"s", "si", "y", "yes"}:
            print("[INFO] Operacion cancelada por usuario.")
            return 0

    csv_path = Path(csv_raw).expanduser()
    normalized_jsonl = normalize_jsonl_input(jsonl_raw)
    jsonl_path = None if normalized_jsonl == "" else Path(normalized_jsonl).expanduser()

    city_payload = city_payload_raw or None

    if (supabase_url and not supabase_service_key) or (supabase_service_key and not supabase_url):
        parser.error("Para Supabase debes pasar ambos: --supabase-url y --supabase-service-key")

    return exporter.run(
        links,
        csv_path=csv_path,
        jsonl_path=jsonl_path,
        supabase_url=supabase_url,
        supabase_service_key=supabase_service_key,
        supabase_rpc=args.supabase_rpc,
        source_code=args.source_code.strip().lower(),
        business_type_code=args.business_type_code.strip().lower(),
        country_code=args.country_code.strip().upper(),
        city=city_payload,
    )


if __name__ == "__main__":
    sys.exit(main())
