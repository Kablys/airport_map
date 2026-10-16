"""Pre-fetch Wizz Air fare calendars into prod/fares-W6.json.

Wizz Air's fare API rejects browser requests (no CORS), so the map can't ask it live as it does Ryanair's.
Run `uv run python fares.py` (or `mise run fares`) to refresh. Wizz throttles bursts, so it goes one request
a second (~1.5 h for every route) and saves progress in .cache/: if it stops, run it again the same day to resume.
Fares go stale: the file records the days it covers, and the map estimates Wizz legs outside them. Wizz quotes
each route in the origin's currency; prices are converted to EUR at open.er-api.com's daily rates.
"""

import json
import time
from datetime import date, timedelta
from pathlib import Path
from typing import Literal

import httpx
from pydantic import BaseModel

from airlines import WIZZ_API_VERSION, progress

DAYS = 84  # two of the timetable API's 42-day windows
WINDOW_DAYS = 42
REQUEST_DELAY_S = 1.0
BACKOFF_S = [30, 60, 120, 300, 600]  # on 429/503; then give up and keep the progress cache
SAVE_EVERY = 25  # routes
ROUTES = Path(__file__).parent / "prod" / "routes.json"
OUT = Path(__file__).parent / "prod" / "fares-W6.json"
CACHE_DIR = Path(__file__).parent / ".cache"
TIMETABLE = f"https://be.wizzair.com/{WIZZ_API_VERSION}/Api/search/timetable"

DayFares = dict[str, tuple[float, str]]


class _Price(BaseModel):
    amount: float
    currencyCode: str  # noqa: N815 - API field name


class _Flight(BaseModel):
    departureDate: str  # noqa: N815 - API field name
    price: _Price
    departureDates: list[str]  # noqa: N815 - API field name


class _Timetable(BaseModel):
    outboundFlights: list[_Flight]  # noqa: N815 - API field name


class _Rates(BaseModel):
    result: Literal["success"]
    rates: dict[str, float]  # units per 1 EUR


def day_fares(flights: list[_Flight], eur_rates: dict[str, float]) -> DayFares:
    """YYYY-MM-DD -> (price in EUR, first departure HH:MM).

    Days priced 0 ("checkPrice") have flights but no published fare, so they are left out like days without flights.
    """
    fares: DayFares = {}
    for flight in flights:
        if flight.price.amount <= 0 or not flight.departureDates:
            continue
        rate = eur_rates.get(flight.price.currencyCode)
        if rate is None:
            raise ValueError(f"No EUR exchange rate for {flight.price.currencyCode}")
        fares[flight.departureDate[:10]] = (round(flight.price.amount / rate, 2), min(flight.departureDates)[11:16])
    return fares


def post_timetable(client: httpx.Client, body: dict) -> httpx.Response:
    for wait in [*BACKOFF_S, None]:
        time.sleep(REQUEST_DELAY_S)
        response = client.post(TIMETABLE, json=body)
        if response.status_code not in (429, 503):
            return response
        if wait is None:
            break
        print(f"\nWizz Air is throttling (HTTP {response.status_code}), waiting {wait}s")
        time.sleep(wait)
    raise RuntimeError("Wizz Air keeps throttling; progress is saved, run fares.py again later to resume")


def fetch_route(client: httpx.Client, origin: str, dest: str, start: date) -> list[_Flight] | None:
    """Flights over the DAYS from `start`, or None when Wizz no longer sells the route."""
    flights: list[_Flight] = []
    for offset in range(0, DAYS, WINDOW_DAYS):
        first = start + timedelta(days=offset)
        window = {
            "departureStation": origin,
            "arrivalStation": dest,
            "from": first.isoformat(),
            "to": (first + timedelta(days=WINDOW_DAYS - 1)).isoformat(),
        }
        body = {"flightList": [window], "priceType": "regular", "adultCount": 1, "childCount": 0, "infantCount": 0}
        response = post_timetable(client, body)
        if response.status_code == 404:
            raise RuntimeError(
                f"Wizz Air API version {WIZZ_API_VERSION} is gone; update WIZZ_API_VERSION in airlines.py"
            )
        if response.status_code == 400 and "InvalidMarket" in response.text:
            return None
        flights += _Timetable.model_validate(response.raise_for_status().json()).outboundFlights
    return flights


def main() -> None:
    network: dict[str, dict[str, list[str]]] = json.loads(ROUTES.read_text())
    routes = sorted(f"{o}-{d}" for o, dests in network.items() for d, airlines in dests.items() if "W6" in airlines)
    start = date.today() + timedelta(days=1)
    cache_file = CACHE_DIR / f"fares-W6-{start}.json"
    # route -> day fares, or None when Wizz doesn't sell it
    done: dict[str, DayFares | None] = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    todo = [r for r in routes if r not in done]
    print(f"{len(done)} routes already fetched today, {len(todo)} to go")

    def save() -> None:
        CACHE_DIR.mkdir(exist_ok=True)
        cache_file.write_text(json.dumps(done))

    with httpx.Client(timeout=30) as client:
        rates = _Rates.model_validate(client.get("https://open.er-api.com/v6/latest/EUR").raise_for_status().json())
        try:
            for i, route in enumerate(progress(todo, "Wizz Air fares"), 1):
                flights = fetch_route(client, *route.split("-"), start)
                done[route] = None if flights is None else day_fares(flights, rates.rates)
                if i % SAVE_EVERY == 0:
                    save()
        finally:
            save()

    unsold = [r for r in routes if done[r] is None]
    fares = {r: f for r in routes if (f := done[r]) is not None}
    if unsold:
        print(f"{len(unsold)} routes in routes.json that Wizz Air no longer sells, e.g. {', '.join(unsold[:5])}")
    to = start + timedelta(days=DAYS - 1)
    payload = {"fetched": date.today().isoformat(), "from": start.isoformat(), "to": to.isoformat(), "routes": fares}
    OUT.write_text(json.dumps(payload, separators=(",", ":"), sort_keys=True))
    print(f"Wrote {OUT} ({sum(map(len, fares.values()))} priced days over {len(fares)} routes)")
    cache_file.unlink()


if __name__ == "__main__":
    main()
