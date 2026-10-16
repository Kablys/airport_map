"""Fetch low-cost airline route networks and write prod/airports.json, prod/routes.json and prod/airlines.json.

Run with `uv run python build.py` (or `mise run data`), then review `git diff prod/` before committing.
Airport coordinates and countries come from OurAirports (public domain), because airline APIs have had wrong ones.
"""

import io
import json
from pathlib import Path

import httpx
import polars as pl

from airlines import AirlineNetwork, ryanair, volotea, vueling, wizzair

FETCHERS = [ryanair, wizzair, vueling, volotea]  # earlier airlines win when naming an airport
OURAIRPORTS = "https://davidmegginson.github.io/ourairports-data"
OUT_DIR = Path(__file__).parent / "prod"
# Airlines using a different IATA code than OurAirports for the same airport
IATA_ALIASES = {"MLH": "BSL"}  # EuroAirport Basel-Mulhouse-Freiburg


def flag_emoji(country_code: str) -> str:
    return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in country_code.upper())


def load_reference(client: httpx.Client) -> pl.DataFrame:
    """One row per IATA code with lat, lng, country name and ISO country code."""
    airports = pl.read_csv(
        io.BytesIO(client.get(f"{OURAIRPORTS}/airports.csv").raise_for_status().content), infer_schema_length=0
    )
    countries = pl.read_csv(
        io.BytesIO(client.get(f"{OURAIRPORTS}/countries.csv").raise_for_status().content), infer_schema_length=0
    )
    return (
        airports.filter(pl.col("iata_code").str.len_chars() == 3)
        .join(countries.select(pl.col("code").alias("iso_country"), pl.col("name").alias("country")), on="iso_country")
        .select(
            pl.col("iata_code").alias("code"),
            pl.col("latitude_deg").cast(pl.Float64).round(4).alias("lat"),
            pl.col("longitude_deg").cast(pl.Float64).round(4).alias("lng"),
            "country",
            "iso_country",
        )
        .unique("code", keep="first")
    )


def merge(networks: list[AirlineNetwork], reference: pl.DataFrame) -> tuple[list[dict], dict, list[dict]]:
    """Combine airline networks into (airports, routes, airlines) as written to prod/.

    routes maps origin -> destination -> sorted airline codes. Airports missing from the reference are dropped
    together with their routes, and reported.
    """
    known = {row["code"]: row for row in reference.iter_rows(named=True)}
    routes: dict[str, dict[str, set[str]]] = {}
    unknown: set[str] = set()
    for network in networks:
        for origin, destinations in network.routes.items():
            origin = IATA_ALIASES.get(origin, origin)
            for dest in destinations:
                dest = IATA_ALIASES.get(dest, dest)
                if origin not in known or dest not in known:
                    unknown |= {code for code in (origin, dest) if code not in known}
                    continue
                routes.setdefault(origin, {}).setdefault(dest, set()).add(network.code)
    if unknown:
        print(f"Dropped airports missing from OurAirports: {sorted(unknown)}")

    used = set(routes) | {dest for dests in routes.values() for dest in dests}
    airports = []
    for code in sorted(used):
        ref = known[code]
        aliases = [code, *(alias for alias, target in IATA_ALIASES.items() if target == code)]
        info = next((n.airports[a] for n in networks for a in aliases if a in n.airports), None)
        airports.append(
            {
                "name": info.name if info else code,
                "code": code,
                "city": info.city if info else code,
                "country": ref["country"],
                "lat": ref["lat"],
                "lng": ref["lng"],
                "flag": flag_emoji(ref["iso_country"]),
            }
        )
    sorted_routes = {o: {d: sorted(routes[o][d]) for d in sorted(routes[o])} for o in sorted(routes)}
    return airports, sorted_routes, [{"code": n.code, "name": n.name} for n in networks]


def write_json_lines(path: Path, data: list | dict) -> None:
    """One entry per line, so `git diff` shows which airport or origin changed."""
    match data:
        case list():
            entries = [json.dumps(item, ensure_ascii=False) for item in data]
            open_, close = "[", "]"
        case dict():
            entries = [f"{json.dumps(key)}: {json.dumps(value, ensure_ascii=False)}" for key, value in data.items()]
            open_, close = "{", "}"
    path.write_text(f"{open_}\n" + ",\n".join(entries) + f"\n{close}\n", encoding="utf-8")


def main() -> None:
    headers = {"User-Agent": "airport-map/1.0 (+https://github.com/Kablys/airport_map)"}
    with httpx.Client(headers=headers, timeout=30, follow_redirects=True) as client:
        reference = load_reference(client)
        networks = [fetch(client) for fetch in FETCHERS]
    airports, routes, airlines = merge(networks, reference)
    write_json_lines(OUT_DIR / "airports.json", airports)
    write_json_lines(OUT_DIR / "routes.json", routes)
    write_json_lines(OUT_DIR / "airlines.json", airlines)
    route_count = sum(len(d) for d in routes.values())
    print(f"Wrote {len(airports)} airports, {route_count} directed routes, {len(airlines)} airlines to {OUT_DIR}")


if __name__ == "__main__":
    main()
