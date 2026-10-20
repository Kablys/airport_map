"""Route-network fetchers: one function per airline, each returning an AirlineNetwork.

They call the JSON endpoints the airlines' own websites use. These are unofficial and change without notice,
so every response is validated with Pydantic and a failure stops the build instead of writing partial data.
"""

import os
import time
from collections.abc import Iterable, Iterator
from datetime import date, datetime, timedelta
from pathlib import Path

import httpx
from pydantic import BaseModel, TypeAdapter

REQUEST_DELAY_S = 1.0  # politeness delay between per-airport requests


class AirportInfo(BaseModel):
    """How an airline names an airport; coordinates and country come from OurAirports instead."""

    name: str
    city: str


class AirlineNetwork(BaseModel):
    code: str  # IATA airline code; name and colors live in airlines.toml
    airports: dict[str, AirportInfo]
    routes: dict[str, set[str]]  # origin IATA -> direct destination IATAs
    # "FROM-TO" -> month "YYYY-MM" -> ISO weekdays flown that month, e.g. "135" = Mon, Wed, Fri; when known
    schedules: dict[str, dict[str, str]] = {}


# A flight's operating period: origin, destination, first day, last day, ISO weekday digits ("1   5 7")
Period = tuple[str, str, date, date, str]


def weekdays_by_month(periods: Iterable[Period], since: date = date.min) -> dict[str, dict[str, str]]:
    """Route "FROM-TO" -> month -> weekdays flown that month, from operating periods (which can span months)."""
    flown: dict[str, dict[str, set[str]]] = {}
    for origin, dest, first, last, days in periods:
        day = max(first, since)
        while day <= last:
            weekday = str(day.isoweekday())
            if weekday in days:
                flown.setdefault(f"{origin}-{dest}", {}).setdefault(day.strftime("%Y-%m"), set()).add(weekday)
            day += timedelta(days=1)
    return {r: {m: "".join(sorted(d)) for m, d in sorted(months.items())} for r, months in sorted(flown.items())}


def network_from_schedules(code: str, schedules: dict[str, dict[str, str]], names: dict[str, str]) -> AirlineNetwork:
    routes: dict[str, set[str]] = {}
    for route in schedules:
        origin, dest = route.split("-")
        routes.setdefault(origin, set()).add(dest)
    codes = set(routes) | {d for ds in routes.values() for d in ds}
    return AirlineNetwork(
        code=code,
        # Names only when the source has them; otherwise build.py falls back to OurAirports
        airports={c: AirportInfo(name=names[c], city=names[c]) for c in codes if c in names},
        routes=routes,
        schedules=schedules,
    )


def ddmmmyy(value: str) -> date:
    """Dates like 01NOV26, as SSIM and the Lufthansa API write them."""
    return datetime.strptime(value.title(), "%d%b%y").date()


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
        airports={s.code: AirportInfo(name=s.name, city=s.name) for s in stations},
        routes={s.code: {r.code for r in s.routes if not r.isConnection and not r.isMac} for s in stations},
    )


# --- Volotea -------------------------------------------------------------------------------------------------------


class _VoloteaName(BaseModel):
    Name: str


class _VoloteaMarket(BaseModel):
    Enabled: bool
    OperatingCarrier: str  # markets also include Aegean (A3) and Alitalia (AZ) codeshares
    IsConnectionMarket: bool


class _VoloteaStation(BaseModel):
    Culture: dict[str, _VoloteaName]
    Markets: dict[str, _VoloteaMarket]


def volotea(client: httpx.Client) -> AirlineNetwork:
    response = client.get("https://json.volotea.com/dist/stations/stations.json", params={"v": 1}).raise_for_status()
    stations = TypeAdapter(dict[str, _VoloteaStation]).validate_python(response.json())
    routes = {
        code: {
            dest
            for dest, market in station.Markets.items()
            if market.Enabled and market.OperatingCarrier == "V7" and not market.IsConnectionMarket
        }
        for code, station in stations.items()
    }
    names = {code: s.Culture["en-GB"].Name for code, s in stations.items() if "en-GB" in s.Culture}
    return AirlineNetwork(
        code="V7",
        airports={code: AirportInfo(name=name, city=name) for code, name in names.items()},
        routes={code: dests for code, dests in routes.items() if dests},
    )


# --- easyJet -------------------------------------------------------------------------------------------------------
# Its other endpoints sit behind Akamai; this route-map cache answers a normal browser User-Agent.

EASYJET_ROUTES = "https://www.easyjet.com/ejcms/cache2m/api/inspireme/getroutedata"
BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
)


class _EasyJetName(BaseModel):
    AirportName: str


class _EasyJetAirport(BaseModel):
    AirportCode: str
    NameContent: _EasyJetName


class _EasyJetRoute(BaseModel):
    origin: str
    destination: str


class _EasyJetRouteData(BaseModel):
    Airports: list[_EasyJetAirport]
    Routes: list[_EasyJetRoute]


def easyjet(client: httpx.Client) -> AirlineNetwork:
    def route_data(origin: str) -> _EasyJetRouteData | None:
        response = client.get(
            EASYJET_ROUTES,
            params={"CurrencyId": 4, "originIata": origin, "sc_lang": "en"},
            headers={"User-Agent": BROWSER_UA, "Accept": "application/json"},
        ).raise_for_status()
        body = response.json()
        return None if body is None else _EasyJetRouteData.model_validate(body)  # null: not an easyJet airport

    first = route_data("LGW")
    if first is None:
        raise RuntimeError("easyJet route data for LGW came back empty; the endpoint may have changed")
    routes: dict[str, set[str]] = {}
    for airport in progress(first.Airports, "easyJet routes"):
        data = first if airport.AirportCode == "LGW" else route_data(airport.AirportCode)
        if data:
            routes[airport.AirportCode] = {r.destination for r in data.Routes if r.origin == airport.AirportCode}
        time.sleep(REQUEST_DELAY_S)
    return AirlineNetwork(
        code="U2",
        airports={
            a.AirportCode: AirportInfo(name=a.NameContent.AirportName, city=a.NameContent.AirportName)
            for a in first.Airports
        },
        routes={o: d for o, d in routes.items() if d},
    )


# --- Pegasus -------------------------------------------------------------------------------------------------------
# Answers 406 without the headers its website sends.


class _PegasusPort(BaseModel):
    portCode: str  # noqa: N815 - API field name; city groups look like "IST_SAW"
    portName: str  # noqa: N815
    cityName: str  # noqa: N815
    isDirect: bool = False  # noqa: N815


class _PegasusDeparture(BaseModel):
    departure: _PegasusPort
    arrivalList: list[_PegasusPort]  # noqa: N815


class _PegasusMatrix(BaseModel):
    destinationList: list[_PegasusDeparture]  # noqa: N815


def pegasus(client: httpx.Client) -> AirlineNetwork:
    response = client.get(
        "https://web.flypgs.com/pegasus/port-matrix",
        headers={"User-Agent": BROWSER_UA, "Accept": "application/json", "x-platform": "web", "Accept-Language": "en"},
    ).raise_for_status()
    # City groups ("IST_SAW") repeat their airports' own entries
    departures = [
        d for d in _PegasusMatrix.model_validate(response.json()).destinationList if "_" not in d.departure.portCode
    ]
    ports = {p.portCode: p for d in departures for p in [d.departure, *d.arrivalList] if "_" not in p.portCode}
    return AirlineNetwork(
        code="PC",
        airports={code: AirportInfo(name=p.portName, city=p.cityName) for code, p in ports.items()},
        routes={
            d.departure.portCode: {a.portCode for a in d.arrivalList if a.isDirect and "_" not in a.portCode}
            for d in departures
        },
    )


# --- Lufthansa Open API (Lufthansa Group schedules) ----------------------------------------------------------------
# Needs LH_CLIENT_ID / LH_CLIENT_SECRET from developer.lufthansa.com (registration was on hold in October 2026).
# Its flight schedules cover LH, EN, LX, OS, WK, SN and 4Y; Eurowings (EW) isn't documented.

LH_API = "https://api.lufthansa.com/v1"


class _LhPeriod(BaseModel):
    startDate: str  # noqa: N815 - API field name, e.g. "01NOV26"
    endDate: str  # noqa: N815
    daysOfOperation: str  # noqa: N815 - weekday digits, 1 = Monday


class _LhLeg(BaseModel):
    origin: str
    destination: str


class _LhSchedule(BaseModel):
    periodOfOperationLT: _LhPeriod  # noqa: N815 - local time
    legs: list[_LhLeg]


def lufthansa_schedules(schedules: list[_LhSchedule]) -> dict[str, dict[str, str]]:
    """Route -> month -> weekdays flown."""
    return weekdays_by_month(
        (leg.origin, leg.destination, ddmmmyy(p.startDate), ddmmmyy(p.endDate), p.daysOfOperation)
        for s in schedules
        for p in [s.periodOfOperationLT]
        for leg in s.legs
    )


def lufthansa(client: httpx.Client, airline: str, months: int = 6) -> AirlineNetwork:
    """One Lufthansa Group airline's routes and weekdays flown, for the next `months` months."""
    client_id, secret = os.environ.get("LH_CLIENT_ID"), os.environ.get("LH_CLIENT_SECRET")
    if not client_id or not secret:
        raise RuntimeError("Set LH_CLIENT_ID and LH_CLIENT_SECRET (developer.lufthansa.com) in .env")
    token = (
        client.post(
            f"{LH_API}/oauth/token",
            data={"client_id": client_id, "client_secret": secret, "grant_type": "client_credentials"},
        )
        .raise_for_status()
        .json()["access_token"]
    )
    schedules: list[_LhSchedule] = []
    first = date.today().replace(day=1)
    for i in progress(list(range(months)), f"{airline} schedules"):
        start = (first + timedelta(days=32 * i)).replace(day=1)
        end = (start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        response = client.get(
            f"{LH_API}/flight-schedules/flightschedules/passenger",
            params={
                "airlines": airline,
                "startDate": start.strftime("%d%b%y").upper(),
                "endDate": end.strftime("%d%b%y").upper(),
                "daysOfOperation": "1234567",
                "timeMode": "LT",
            },
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        )
        if response.status_code == 404:  # no flights in that window
            continue
        schedules += TypeAdapter(list[_LhSchedule]).validate_python(response.raise_for_status().json())
        time.sleep(REQUEST_DELAY_S)
    return network_from_schedules(airline, lufthansa_schedules(schedules), {})


# --- Transavia, from Air France-KLM's published SSIM timetable -----------------------------------------------------
# transavia.com and its API block scripts, but the French open-data portal carries the AF/KL/TO/HV season timetable
# as an IATA SSIM file (fixed-width, one line per flight leg and period). Its licence field says "not specified".

AFKL_DATASET = "https://www.data.gouv.fr/api/1/datasets/programme-des-vols-air-france/"
SSIM_CACHE = Path(__file__).parent / ".cache"


def ssim_periods(lines: Iterable[str], airlines: set[str]) -> Iterator[Period]:
    """Operating periods of scheduled passenger legs (SSIM type 3 records, service type J) flown by `airlines`."""
    for line in lines:
        if len(line) < 57 or line[0] != "3" or line[2:5].strip() not in airlines or line[13] != "J":
            continue
        yield line[36:39], line[54:57], ddmmmyy(line[14:21]), ddmmmyy(line[21:28]), line[28:35]


def transavia(client: httpx.Client) -> AirlineNetwork:
    dataset = client.get(AFKL_DATASET).raise_for_status().json()
    ssims = [r for r in dataset["resources"] if r["url"].endswith(".ssim")]
    if not ssims:
        raise RuntimeError(f"No .ssim file in {AFKL_DATASET}")
    latest = max(ssims, key=lambda r: r["last_modified"])
    path = SSIM_CACHE / latest["url"].rsplit("/", 1)[-1]
    if not path.exists():  # ~80 MB; a new season gets a new file name
        SSIM_CACHE.mkdir(exist_ok=True)
        with client.stream("GET", latest["url"]) as response:
            response.raise_for_status()
            with path.open("wb") as file:
                for chunk in response.iter_bytes():
                    file.write(chunk)
    with path.open(encoding="ascii", errors="replace") as lines:
        # Transavia Netherlands (HV) and France (TO) sell as one brand
        schedules = weekdays_by_month(ssim_periods(lines, {"HV", "TO"}), since=date.today())
    return network_from_schedules("HV", schedules, {})
