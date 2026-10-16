"""Route-network fetchers: one function per airline, each returning an AirlineNetwork.

They call the JSON endpoints the airlines' own websites use. These are unofficial and change without notice,
so every response is validated with Pydantic and a failure stops the build instead of writing partial data.
"""

import time
from collections.abc import Iterable

import httpx
from pydantic import BaseModel, TypeAdapter

REQUEST_DELAY_S = 1.0  # politeness delay between per-airport requests


class AirportInfo(BaseModel):
    """How an airline names an airport; coordinates and country come from OurAirports instead."""

    name: str
    city: str


class AirlineNetwork(BaseModel):
    code: str  # IATA airline code
    name: str
    airports: dict[str, AirportInfo]
    routes: dict[str, set[str]]  # origin IATA -> direct destination IATAs


def progress[T](items: list[T], label: str) -> Iterable[T]:
    for i, item in enumerate(items, 1):
        print(f"\r{label}: {i}/{len(items)}", end="", flush=True)
        yield item
    print()


# --- Ryanair -------------------------------------------------------------------------------------------------------


class _RyanairCity(BaseModel):
    name: str


class _RyanairAirport(BaseModel):
    code: str
    name: str
    city: _RyanairCity


class _RyanairRoute(BaseModel):
    arrivalAirport: _RyanairAirport  # noqa: N815 - API field name


def ryanair(client: httpx.Client) -> AirlineNetwork:
    base = "https://www.ryanair.com/api/views/locate"
    airports = TypeAdapter(list[_RyanairAirport]).validate_python(
        client.get(f"{base}/5/airports/en/active").raise_for_status().json()
    )
    routes: dict[str, set[str]] = {}
    for airport in progress(airports, "Ryanair routes"):
        response = client.get(f"{base}/searchWidget/routes/en/airport/{airport.code}").raise_for_status()
        destinations = TypeAdapter(list[_RyanairRoute]).validate_python(response.json())
        routes[airport.code] = {d.arrivalAirport.code for d in destinations}
        time.sleep(REQUEST_DELAY_S)
    return AirlineNetwork(
        code="FR",
        name="Ryanair",
        airports={a.code: AirportInfo(name=a.name, city=a.city.name) for a in airports},
        routes=routes,
    )


# --- Wizz Air ------------------------------------------------------------------------------------------------------


class _WizzConnection(BaseModel):
    iata: str
    isDirectFlight: bool  # noqa: N815 - API field name


class _WizzCity(BaseModel):
    iata: str
    shortName: str  # noqa: N815 - API field name
    isFakeStation: bool  # noqa: N815 - metro codes like LON, PAR
    connections: list[_WizzConnection]


class _WizzMap(BaseModel):
    cities: list[_WizzCity]


# shortcut: the API path is versioned per deploy and the homepage that embeds it rejects non-browser clients;
# when the request 404s, copy the new version from `apiUrl:"https://be.wizzair.com/<version>/Api"` in the page source
WIZZ_API_VERSION = "29.21.0"


def wizzair(client: httpx.Client) -> AirlineNetwork:
    response = client.get(f"https://be.wizzair.com/{WIZZ_API_VERSION}/Api/asset/map", params={"languageCode": "en-gb"})
    if response.status_code == 404:
        raise RuntimeError(f"Wizz Air API version {WIZZ_API_VERSION} is gone; update WIZZ_API_VERSION in airlines.py")
    all_cities = _WizzMap.model_validate(response.raise_for_status().json()).cities
    cities = [c for c in all_cities if not c.isFakeStation]
    real = {c.iata for c in cities}  # connections also list metro codes, duplicating the real airports
    return AirlineNetwork(
        code="W6",
        name="Wizz Air",
        airports={c.iata: AirportInfo(name=c.shortName, city=c.shortName) for c in cities},
        routes={c.iata: {x.iata for x in c.connections if x.isDirectFlight and x.iata in real} for c in cities},
    )


# --- Vueling -------------------------------------------------------------------------------------------------------


class _VuelingRoute(BaseModel):
    code: str
    isConnection: bool  # noqa: N815 - API field name
    isMac: bool  # noqa: N815 - metro codes like LON, PAR


class _VuelingStation(_VuelingRoute):
    name: str
    routes: list[_VuelingRoute]


class _VuelingStations(BaseModel):
    value: list[_VuelingStation]


class _VuelingResponse(BaseModel):
    stations: _VuelingStations


def vueling(client: httpx.Client) -> AirlineNetwork:
    response = client.get("https://static.vueling.com/corporativeCMS/Stations/en-GB.json").raise_for_status()
    stations = [s for s in _VuelingResponse.model_validate(response.json()).stations.value if not s.isMac]
    return AirlineNetwork(
        code="VY",
        name="Vueling",
        airports={s.code: AirportInfo(name=s.name, city=s.name) for s in stations},
        routes={s.code: {r.code for r in s.routes if not r.isConnection and not r.isMac} for s in stations},
    )
