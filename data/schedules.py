"""Fetch easyJet's timetable into prod/schedules.json: per route and month, the weekdays it flies.

easyJet's low-fare calendar (the one its booking page shows) answers a browser User-Agent with ~11 months of days per
route, each marked bookable or not. One request per route at one a second is ~45 min for the whole network; progress
is saved in .cache/, so if it stops, run it again the same day to resume. The cache also keeps each day's lowest fare.
Run after build.py (it reads easyJet's routes from prod/routes.json). Transavia's timetable comes from build.py.
"""

import json
import time
from datetime import date
from pathlib import Path

import httpx
from pydantic import BaseModel

from airlines import BROWSER_UA, progress
from build import write_schedules

LOWEST_FARES = "https://www.easyjet.com/ejcms/nocache/api/lowestfares/get/"
REQUEST_DELAY_S = 1.0
SAVE_EVERY = 25  # routes
ROUTES = Path(__file__).parent / "prod" / "routes.json"
CACHE_DIR = Path(__file__).parent / ".cache"
BOOKABLE = 2  # flightStatus of a day with a fare; 0 = no flight that day

DayFares = dict[str, float | None]  # YYYY-MM-DD -> lowest fare (None when flying but not priced)


class _Day(BaseModel):
    day: int
    lowestFare: float | None  # noqa: N815 - API field name
    flightStatus: int  # noqa: N815


class _Month(BaseModel):
    year: int
    month: int
    days: list[_Day]


class _LowestFares(BaseModel):
    months: list[_Month]


def flying_days(calendar: _LowestFares) -> DayFares:
    return {
        f"{m.year}-{m.month:02}-{d.day:02}": d.lowestFare
        for m in calendar.months
        for d in m.days
        if d.flightStatus == BOOKABLE
    }


def weekdays(days: DayFares) -> dict[str, str]:
    """Month -> ISO weekdays flown, e.g. {"2026-11": "1357"}."""
    by_month: dict[str, set[str]] = {}
    for day in days:
        by_month.setdefault(day[:7], set()).add(str(date.fromisoformat(day).isoweekday()))
    return {month: "".join(sorted(wd)) for month, wd in sorted(by_month.items())}


def main() -> None:
    network: dict[str, dict[str, list[str]]] = json.loads(ROUTES.read_text())
    routes = sorted(f"{o}-{d}" for o, dests in network.items() for d, airlines in dests.items() if "U2" in airlines)
    start = date.today().replace(day=1)
    cache_file = CACHE_DIR / f"schedules-U2-{date.today()}.json"
    done: dict[str, DayFares] = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    todo = [r for r in routes if r not in done]
    print(f"{len(done)} easyJet routes already fetched today, {len(todo)} to go")

    def save() -> None:
        CACHE_DIR.mkdir(exist_ok=True)
        cache_file.write_text(json.dumps(done))

    with httpx.Client(timeout=30, headers={"User-Agent": BROWSER_UA, "Accept": "application/json"}) as client:
        try:
            for i, route in enumerate(progress(todo, "easyJet timetable"), 1):
                origin, dest = route.split("-")
                params = {
                    "originIata": origin,
                    "destinationIata": dest,
                    "displayCurrencyId": 4,
                    "languageCode": "en",
                    "startDate": start.isoformat(),
                }
                response = client.get(LOWEST_FARES, params=params).raise_for_status()
                done[route] = flying_days(_LowestFares.model_validate(response.json()))
                if i % SAVE_EVERY == 0:
                    save()
                time.sleep(REQUEST_DELAY_S)
        finally:
            save()

    schedules = {route: weekdays(days) for route in routes if (days := done[route])}
    write_schedules({"U2": schedules})
    print(f"Wrote easyJet schedules for {len(schedules)} of {len(routes)} routes")


if __name__ == "__main__":
    main()
