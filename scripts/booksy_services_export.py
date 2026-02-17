#!/usr/bin/env python3
"""
Extrae datos de negocio y servicios desde enlaces de Booksy y los guarda en CSV/JSONL.

Uso:
  python3 scripts/booksy_services_export.py "https://booksy.com/es-es/..."
  python3 scripts/booksy_services_export.py URL1 URL2 --csv data/servicios.csv --jsonl data/servicios.jsonl
  python3 scripts/booksy_services_export.py URL --supabase-url https://xxx.supabase.co --supabase-service-key eyJ...
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Iterable

BUSINESS_NAME_H1_RE = re.compile(
    r'<h1[^>]*data-testid="business-name"[^>]*>\s*(.*?)\s*</h1>',
    re.IGNORECASE | re.DOTALL,
)
BUSINESS_NAME_DIV_RE = re.compile(
    r'<div[^>]*data-testid="business-name"[^>]*>\s*(.*?)\s*</div>',
    re.IGNORECASE | re.DOTALL,
)
SERVICE_NAME_RE = re.compile(
    r'data-testid="service-name"[^>]*>\s*(.*?)\s*</',
    re.IGNORECASE | re.DOTALL,
)
SERVICE_DURATION_RE = re.compile(
    r'data-testid="service-duration"[^>]*>\s*(.*?)\s*</',
    re.IGNORECASE | re.DOTALL,
)
EURO_PRICE_RE = re.compile(
    r"([0-9]+,[0-9]{2}\s*(?:&nbsp;|\xa0|\s)?€)",
    re.IGNORECASE | re.DOTALL,
)
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def clean_text(raw: str) -> str:
    no_tags = TAG_RE.sub("", raw)
    unescaped = html.unescape(no_tags)
    return WS_RE.sub(" ", unescaped).strip()


def fetch_html(url: str, timeout: int = 20) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            )
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def post_json(url: str, payload: dict, headers: dict[str, str], timeout: int = 20) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        body = response.read().decode(charset, errors="replace")
    if not body:
        return {}
    decoded = json.loads(body)
    return decoded if isinstance(decoded, dict) else {"result": decoded}


def extract_business_name(page_html: str) -> str | None:
    for pattern in (BUSINESS_NAME_H1_RE, BUSINESS_NAME_DIV_RE):
        match = pattern.search(page_html)
        if match:
            name = clean_text(match.group(1))
            if name:
                return name
    return None


def parse_euro_to_cents(price_text: str) -> int | None:
    raw = (
        price_text.replace("€", "")
        .replace("&nbsp;", " ")
        .replace("\xa0", " ")
        .strip()
        .replace(" ", "")
    )
    if not raw:
        return None
    if "," in raw:
        euros, cents = raw.split(",", 1)
    else:
        euros, cents = raw, "00"
    euros = euros.replace(".", "")
    cents = (cents + "00")[:2]
    if not euros.isdigit() or not cents.isdigit():
        return None
    return int(euros) * 100 + int(cents)


def parse_duration_minutes(duration_text: str) -> int | None:
    if not duration_text:
        return None
    text = duration_text.lower()
    hours_match = re.search(r"(\d+)\s*h", text)
    mins_match = re.search(r"(\d+)\s*min", text)
    total = 0
    if hours_match:
        total += int(hours_match.group(1)) * 60
    if mins_match:
        total += int(mins_match.group(1))
    return total if total > 0 else None


def extract_services(page_html: str) -> list[dict[str, str | int | None]]:
    start_marker = 'data-testid="services-services-list"'
    end_marker = 'id="reviews-section"'
    start_index = page_html.find(start_marker)
    if start_index == -1:
        return []
    end_index = page_html.find(end_marker, start_index)
    section = page_html[start_index : end_index if end_index != -1 else None]

    services: list[dict[str, str | int | None]] = []
    matches = list(SERVICE_NAME_RE.finditer(section))
    for index, match in enumerate(matches):
        service_name = clean_text(match.group(1))
        next_start = matches[index + 1].start() if index + 1 < len(matches) else len(section)
        segment = section[match.end() : next_start]

        # Si hay descuento, Booksy suele renderizar "precio anterior, precio actual".
        # Nos quedamos con el último, que es el precio final vigente.
        raw_prices = EURO_PRICE_RE.findall(segment)
        service_price = clean_text(raw_prices[-1]) if raw_prices else ""
        duration_match = SERVICE_DURATION_RE.search(segment)
        duration_text = clean_text(duration_match.group(1)) if duration_match else ""
        duration_minutes = parse_duration_minutes(duration_text)
        price_cents = parse_euro_to_cents(service_price)

        if service_name:
            services.append(
                {
                    "name": service_name,
                    "price_text": service_price,
                    "price_cents": price_cents,
                    "duration_minutes": duration_minutes,
                }
            )
    return services


def normalize_url(url: str) -> str:
    parsed = urllib.parse.urlsplit(url.strip())
    if not parsed.scheme:
        url = f"https://{url.strip()}"
        parsed = urllib.parse.urlsplit(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError(f"URL no soportada: {url}")
    return urllib.parse.urlunsplit(parsed)


def load_existing_keys(csv_path: Path) -> set[tuple[str, str, str, str]]:
    keys: set[tuple[str, str, str, str]] = set()
    if not csv_path.exists():
        return keys
    with csv_path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            keys.add(
                (
                    row.get("url", ""),
                    row.get("business_name", ""),
                    row.get("service_name", ""),
                    row.get("price", ""),
                )
            )
    return keys


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def guess_city_from_url(url: str) -> str | None:
    parsed = urllib.parse.urlsplit(url)
    slug = parsed.path.strip("/").split("/")[-1]
    if "_" in slug:
        city = slug.split("_")[-1].replace("-", " ").strip()
        if city:
            return city.title()
    return None


def guess_external_business_id(url: str) -> str | None:
    parsed = urllib.parse.urlsplit(url)
    for segment in parsed.path.strip("/").split("/"):
        match = re.match(r"^(\d+)_", segment)
        if match:
            return match.group(1)
    return None


def build_supabase_payload(
    *,
    url: str,
    business_name: str,
    services: list[dict[str, str | int | None]],
    source_code: str,
    business_type_code: str,
    country_code: str,
    city: str | None,
) -> dict:
    payload: dict[str, object] = {
        "source_code": source_code,
        "source_url": url,
        "external_business_id": guess_external_business_id(url),
        "business_name": business_name,
        "business_type_code": business_type_code,
        "country_code": country_code,
        "services": [],
    }
    resolved_city = city or guess_city_from_url(url)
    if resolved_city:
        payload["city"] = resolved_city

    service_rows = []
    for service in services:
        has_price = service["price_cents"] is not None
        row: dict[str, object] = {
            "name": service["name"],
            "price_kind": "fixed" if has_price else "quote",
            "currency_code": "EUR",
        }
        if has_price:
            row["price_cents"] = service["price_cents"]
        if service["duration_minutes"] is not None:
            row["duration_minutes"] = service["duration_minutes"]
        service_rows.append(row)
    payload["services"] = service_rows
    return payload


def ingest_supabase(
    *,
    supabase_url: str,
    service_key: str,
    rpc_name: str,
    payload: dict,
) -> dict:
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/rpc/{rpc_name}"
    headers = {
        "Content-Type": "application/json",
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }
    try:
        return post_json(endpoint, {"p_payload": payload}, headers=headers)
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Supabase HTTP {exc.code} en {rpc_name}: {details}"
        ) from exc


def write_csv_rows(csv_path: Path, rows: Iterable[dict[str, str]]) -> int:
    rows = list(rows)
    if not rows:
        return 0

    ensure_parent(csv_path)
    file_exists = csv_path.exists()
    with csv_path.open("a", newline="", encoding="utf-8") as handle:
        fieldnames = ["scraped_at", "url", "business_name", "service_name", "price"]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def write_jsonl_rows(jsonl_path: Path, rows: Iterable[dict[str, str]]) -> int:
    rows = list(rows)
    if not rows:
        return 0

    ensure_parent(jsonl_path)
    with jsonl_path.open("a", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    return len(rows)


def run(
    urls: list[str],
    csv_path: Path,
    jsonl_path: Path | None,
    *,
    supabase_url: str | None,
    supabase_service_key: str | None,
    supabase_rpc: str,
    source_code: str,
    business_type_code: str,
    country_code: str,
    city: str | None,
) -> int:
    existing_keys = load_existing_keys(csv_path)
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    supabase_enabled = bool(supabase_url and supabase_service_key)

    pending_rows: list[dict[str, str]] = []
    errors: list[str] = []

    for original_url in urls:
        try:
            url = normalize_url(original_url)
            html_doc = fetch_html(url)
            business_name = extract_business_name(html_doc)
            if not business_name:
                raise RuntimeError("No se encontró el nombre del negocio.")
            services = extract_services(html_doc)
            if not services:
                raise RuntimeError("No se encontraron servicios.")

            if supabase_enabled:
                payload = build_supabase_payload(
                    url=url,
                    business_name=business_name,
                    services=services,
                    source_code=source_code,
                    business_type_code=business_type_code,
                    country_code=country_code,
                    city=city,
                )
                rpc_result = ingest_supabase(
                    supabase_url=supabase_url or "",
                    service_key=supabase_service_key or "",
                    rpc_name=supabase_rpc,
                    payload=payload,
                )
                print(f"[SUPABASE] {business_name}: {rpc_result}")

            added_for_url = 0
            for service in services:
                service_name = str(service["name"])
                price = str(service["price_text"])
                key = (url, business_name, service_name, price)
                if key in existing_keys:
                    continue
                existing_keys.add(key)
                pending_rows.append(
                    {
                        "scraped_at": now,
                        "url": url,
                        "business_name": business_name,
                        "service_name": service_name,
                        "price": price,
                    }
                )
                added_for_url += 1
            print(
                f"[OK] {business_name}: {len(services)} servicios detectados, "
                f"{added_for_url} nuevos guardados."
            )
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
            errors.append(f"{original_url} -> error de red: {exc}")
        except Exception as exc:  # noqa: BLE001 - CLI robusto para uso práctico
            errors.append(f"{original_url} -> {exc}")

    csv_count = write_csv_rows(csv_path, pending_rows)
    jsonl_count = write_jsonl_rows(jsonl_path, pending_rows) if jsonl_path else 0

    print(f"\nFilas nuevas en CSV: {csv_count}")
    print(f"Archivo CSV: {csv_path}")
    if jsonl_path:
        print(f"Filas nuevas en JSONL: {jsonl_count}")
        print(f"Archivo JSONL: {jsonl_path}")

    if errors:
        print("\nErrores:")
        for err in errors:
            print(f"- {err}")
        return 1
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Guarda negocio + servicios + precios desde enlaces de Booksy."
    )
    parser.add_argument(
        "urls",
        nargs="+",
        help="Uno o varios enlaces de Booksy.",
    )
    parser.add_argument(
        "--csv",
        default="data/booksy_services.csv",
        help="Ruta del CSV acumulado (default: data/booksy_services.csv).",
    )
    parser.add_argument(
        "--jsonl",
        default="data/booksy_services.jsonl",
        help="Ruta JSONL opcional (default: data/booksy_services.jsonl). Usa --jsonl '' para desactivar.",
    )
    parser.add_argument(
        "--supabase-url",
        default=os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""),
        help="URL de Supabase (también lee SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL).",
    )
    parser.add_argument(
        "--supabase-service-key",
        default=os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY", ""),
        help="Service role key de Supabase (también lee SUPABASE_SERVICE_ROLE_KEY).",
    )
    parser.add_argument(
        "--supabase-rpc",
        default="ingest_business_payload",
        help="Nombre del RPC para ingestión (default: ingest_business_payload).",
    )
    parser.add_argument(
        "--source-code",
        default="booksy",
        help="Código de fuente para payload Supabase (default: booksy).",
    )
    parser.add_argument(
        "--business-type-code",
        default="makeup_artist",
        help="Código de tipo de negocio para payload Supabase (default: makeup_artist).",
    )
    parser.add_argument(
        "--country-code",
        default="ES",
        help="Código país ISO-2 (default: ES).",
    )
    parser.add_argument(
        "--city",
        default="",
        help="Ciudad opcional para payload (si no, se intenta inferir desde la URL).",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    csv_path = Path(args.csv).expanduser()
    jsonl_path = None if args.jsonl == "" else Path(args.jsonl).expanduser()
    supabase_url = args.supabase_url.strip() or None
    supabase_service_key = args.supabase_service_key.strip() or None
    city = args.city.strip() or None

    if (supabase_url and not supabase_service_key) or (supabase_service_key and not supabase_url):
        parser.error("Para Supabase debes pasar ambos: --supabase-url y --supabase-service-key")

    return run(
        args.urls,
        csv_path=csv_path,
        jsonl_path=jsonl_path,
        supabase_url=supabase_url,
        supabase_service_key=supabase_service_key,
        supabase_rpc=args.supabase_rpc,
        source_code=args.source_code.strip().lower(),
        business_type_code=args.business_type_code.strip().lower(),
        country_code=args.country_code.strip().upper(),
        city=city,
    )


if __name__ == "__main__":
    sys.exit(main())
