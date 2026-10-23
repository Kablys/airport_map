"""Fetch low-cost airline route networks and write prod/airports.json, routes.json, airlines.json and schedules.json.

Run with `uv run python build.py` (or `mise run data`), then review `git diff prod/` before committing.
Airport coordinates and countries come from OurAirports (public domain), because airline APIs have had wrong ones.
"""

import io
import json
import os
import tomllib
from pathlib import Path

import httpx
import polars as pl
from pydantic import BaseModel, Field

from airlines import AirlineNetwork, easyjet, lufthansa, pegasus, ryanair, transavia, volotea, vueling, wizzair
from wikipedia import wikipedia

FETCHERS = [
    ryanair,
    wizzair,
    vueling,
    volotea,
    easyjet,
    pegasus,
    transavia,
]  # earlier airlines win when naming an airport
# Airlines whose own sites block scripts: routes from Wikipedia airport articles (article title -> IATA code)
WIKIPEDIA_AIRLINES = {
    "Eurowings": "EW",
    "Norwegian Air Shuttle": "DY",
    "Norwegian Air Sweden": "DY",
    "Jet2.com": "LS",
    "AJet": "VF",
    "SunExpress": "XQ",
    "Smartwings": "QS",
    "Iberia Express": "I2",
    "Aeroitalia": "XZ",
    "FlyOne": "5F",
    "HiSky": "H4",
}
# Lufthansa Group airlines read from its Open API when LH_CLIENT_ID / LH_CLIENT_SECRET are set
LUFTHANSA_AIRLINES = ["4Y"]
OURAIRPORTS = "https://davidmegginson.github.io/ourairports-data"
OUT_DIR = Path(__file__).parent / "prod"
CONFIG = Path(__file__).parent / "airlines.toml"
# Airlines using a different IATA code than OurAirports for the same airport
IATA_ALIASES = {"MLH": "BSL"}  # EuroAirport Basel-Mulhouse-Freiburg


class AirlineConfig(BaseModel):
    name: str
    primary: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")


def load_config(path: Path = CONFIG) -> dict[str, AirlineConfig]:
    return {code: AirlineConfig.model_validate(entry) for code, entry in tomllib.loads(path.read_text()).items()}


def flag_emoji(country_code: str) -> str:
    return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in country_code.upper())


def load_ourairports(client: httpx.Client) -> pl.DataFrame:
    return pl.read_csv(
        io.BytesIO(client.get(f"{OURAIRPORTS}/airports.csv").raise_for_status().content), infer_schema_length=0
    )


def load_reference(client: httpx.Client, airports: pl.DataFrame) -> pl.DataFrame:
    """One row per IATA code with lat, lng, country name and ISO country code."""
    countries = pl.read_csv(
        io.BytesIO(client.get(f"{OURAIRPORTS}/countries.csv").raise_for_status().content), infer_schema_length=0
    )
    return (
        airports.filter(pl.col("iata_code").str.len_chars() == 3)
        .join(countries.select(pl.col("code").alias("iso_country"), pl.col("name").alias("country")), on="iso_country")
        .select(
            pl.col("iata_code").alias("code"),
            "name",
            "municipality",
            pl.col("latitude_deg").cast(pl.Float64).round(4).alias("lat"),
            pl.col("longitude_deg").cast(pl.Float64).round(4).alias("lng"),
            "country",
            "iso_country",
        )
        .unique("code", keep="first")
    )


def merge(
    networks: list[AirlineNetwork], reference: pl.DataFrame, config: dict[str, AirlineConfig]
) -> tuple[list[dict], dict, list[dict]]:
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
        # Some airlines send blank names or stray line breaks; skip those for the next source
        named = (n.airports[a] for n in networks for a in aliases if a in n.airports and n.airports[a].name.strip())
        info = next(named, None)
        airports.append(
            {
                # No airline names it (timetable-only sources): OurAirports' name, else the code
                "name": info.name.strip() if info else ref.get("name") or code,
                "code": code,
                "city": (info.city.strip() or info.name.strip())
                if info
                else ref.get("municipality") or ref.get("name") or code,
                "country": ref["country"],
                "lat": ref["lat"],
                "lng": ref["lng"],
                "flag": flag_emoji(ref["iso_country"]),
            }
        )
    sorted_routes = {o: {d: sorted(routes[o][d]) for d in sorted(routes[o])} for o in sorted(routes)}
    missing = [n.code for n in networks if n.code not in config]
    if missing:
        raise ValueError(f"Airlines missing from {CONFIG.name}: {missing}")
    airlines = [
        {
            "code": n.code,
            "name": config[n.code].name,
            "colors": {"primary": config[n.code].primary, "secondary": config[n.code].secondary},
        }
        for n in networks
    ]
    return airports, sorted_routes, airlines


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


SCHEDULES = OUT_DIR / "schedules.json"


def write_schedules(update: dict[str, dict[str, dict[str, str]]]) -> None:
    """Replace the given airlines' entries in prod/schedules.json (airline -> "FROM-TO" -> month -> weekdays)."""
    schedules = json.loads(SCHEDULES.read_text()) if SCHEDULES.exists() else {}
    schedules.update(update)
    lines = [f"{json.dumps(code)}: {json.dumps(schedules[code], sort_keys=True)}" for code in sorted(schedules)]
    SCHEDULES.write_text("{\n" + ",\n".join(lines) + "\n}\n", encoding="utf-8")


def main() -> None:
    headers = {"User-Agent": "airport-map/1.0 (+https://github.com/Kablys/airport_map)"}
    with httpx.Client(headers=headers, timeout=60, follow_redirects=True) as client:
        ourairports = load_ourairports(client)
        reference = load_reference(client, ourairports)
        networks = [fetch(client) for fetch in FETCHERS]
        networks += wikipedia(client, ourairports, WIKIPEDIA_AIRLINES)
        if os.environ.get("LH_CLIENT_ID"):
            networks += [lufthansa(client, code) for code in LUFTHANSA_AIRLINES]
        else:
            print(f"No LH_CLIENT_ID: skipping Lufthansa Group airlines {LUFTHANSA_AIRLINES}")
    airports, routes, airlines = merge(networks, reference, load_config())
    write_json_lines(OUT_DIR / "airports.json", airports)
    write_json_lines(OUT_DIR / "routes.json", routes)
    write_json_lines(OUT_DIR / "airlines.json", airlines)
    # Only airlines with a timetable source; schedules.py adds easyJet's into the same file
    schedules = {n.code: n.schedules for n in networks if n.schedules}
    write_schedules(schedules)
    route_count = sum(len(d) for d in routes.values())
    print(f"Wrote {len(airports)} airports, {route_count} directed routes, {len(airlines)} airlines to {OUT_DIR}")


if __name__ == "__main__":
    main()
