# Plan

Future goals for the map. Tick items off as they land; add notes on sources that work or are blocked. Background data wish-list: [`data/README.md`](data/README.md).

## 1. More airlines

Done (sources in [`data/README.md`](data/README.md)):
- **Own JSON:** Ryanair, Wizz Air, Vueling, Volotea, easyJet (`inspireme/getroutedata`, browser User-Agent), Pegasus (`web.flypgs.com/pegasus/port-matrix` with `x-platform: web`).
- **Published timetable:** Transavia (Air France-KLM SSIM on data.gouv.fr).
- **Wikipedia airport tables** (sites block scripts): Eurowings, Norwegian, Jet2, AJet, SunExpress, Smartwings, Iberia Express, Aeroitalia, FlyOne, HiSky.
- **Schedules** (`prod/schedules.json`): Transavia (SSIM), easyJet (`lowestfares`, `mise run schedules`).

- [ ] **More airlines / better sources** (checked 2026-10-20)
  - [ ] **airBaltic (BT)**: works (`airbaltic.com/api/orig-dest/en`, 250 direct routes; `api/fsf/outbound?origin=RIX&destin=AMS` gives a year of days per route). Hybrid carrier, not low-cost. Decide.
  - [ ] **SKY express (GQ)**: `skyexpress.gr/assets/data/route-map-en.json` (182 direct routes, one request). Regional, not low-cost. Decide.
  - [ ] **FlyOne (5F)** own list: `flyone.eu/media/<uuid>/…/route-data.js` mixes in connections; a per-route 30-day schedule (`api4.flyone.eu/api/search/fare-calendar-schedule`) needs a short-lived token from the page. Wikipedia for now.
  - [ ] **HiSky (H4)** own list: `booking.hisky.aero/VARS/Public/b/flightCal.aspx` redirect body has bookable markets, likely incl. connections. Wikipedia for now.
  - [ ] **Blocked live** (Cloudflare/Akamai/Incapsula, nothing found): Eurowings, Norwegian, Jet2, SunExpress, Smartwings, AJet, Aeroitalia; Transavia's API is partner-only now. Wikipedia covers their routes; no schedules.
  - [ ] **Lufthansa Open API**: client ready (`lufthansa()` in `data/airlines.py`, Discover 4Y); needs keys, registration on hold. Doesn't list Eurowings.
  - [ ] **Leisure/charter airlines** (TUI, Condor, Corendon, Neos, Marabu, Binter): one line each in `WIKIPEDIA_AIRLINES`; left out as not low-cost.
  - [ ] **easyJet fares**: `schedules.py` already caches each day's lowest fare (11 months); export it like `fares-W6.json` and price easyJet legs.
  - [ ] **Schedules in the map**: the trip CLI uses `prod/schedules.json`; the map's planner still assumes daily flights for airlines without fares.
- [ ] **Wizz Air version**: `WIZZ_API_VERSION` is hard-coded because the page that shows it blocks scripts; find another way to detect it.

## 2. Airport info

- [ ] Airport detail panel: full name, ICAO, elevation, website and Wikipedia links (OurAirports `home_link`, `wikipedia_link`).
- [ ] Which airlines have a base there (Ryanair's airport list has a `base` flag).
- [ ] Distance and transport to the city centre (Wikidata P931 "place served by", OpenStreetMap).
- [ ] Passenger numbers per year (Wikidata P3872).
- [ ] Time zone (Ryanair `timeZone`, or from coordinates).

## 3. Table view

- [ ] Sortable, filterable table of airports: city, country, airlines, route count, est. cheapest flight.
- [ ] Routes table for a selected airport (destination, airlines, distance, flight time, est. price).
- [ ] Click a row to fly to it on the map; filters shared with the map's airline filter.
- [ ] CSV export.

## 4. City info page

- [ ] One page per city (`?city=…` or its own route) linked from the map and table.
- [ ] Summary and photo from Wikipedia / Wikivoyage.
- [ ] Facts from Wikidata: population, area, elevation, currency, languages, EU/Schengen (see `data/wikidata/`).
- [ ] Airports serving the city and where you can fly direct from them.
- [ ] Climate chart (see section 5).

## 5. Seasonal changes

- [ ] **Routes by season**: Ryanair route entries have `seasonal`; Wizz Air has `operationStartDate`; Volotea markets have `MinFlightDate`/`MaxFlightDate`. Store them and add a month selector that hides routes not flown that month.
- [ ] **Schedules**: Ryanair timetable endpoint (`timtbl/3/schedules/{from}/{to}/years/{y}/months/{m}`) for days of the week each route flies.
- [ ] **Weather**: monthly temperature/rain per city (Open-Meteo climate API; Volotea's station file already has monthly min/max/icon). Colour airports by the selected month's temperature.
- [ ] **Prices**: replace the distance-based estimate with real fares per month (Ryanair `farfnd` fare finder, easyJet inspire cache has prices for UK origins). Cheapest month per route; price calendar.
- [ ] Trip timeline from the original idea list: days each flight is available, chosen flights, time to spend in each stop (with airport buffer).

## 6. Nomads.com-style destination features

Inspired by [nomads.com](https://nomads.com/) (city cards ranked by scores, ~200 sortable metrics, grid/map/chart/compare views, city guide pages). Each needs a free data source; candidates noted.

- [ ] **Score cards grid**: destination cards with photo, overall score, cost, internet, safety, current temperature and air quality.
- [ ] **Sort and filter by metrics**: cost, weather, safety, internet, population, … with range filters.
- [ ] **Views**: grid / map / chart (scatter of two metrics) / compare two cities side by side.
- [ ] **Flight time / reachable from home**: filter cities by direct flights from a home airport and flight time. Our route data already supports this.
- [ ] **Monthly weather and best time to visit**: temperature, humidity, UV per month and a per-month score (Open-Meteo).
- [ ] **Cost of living**: nomad/local monthly cost, rent, hotel, Airbnb, meal, coffee, beer (Numbeo has no free API; Eurostat price levels, Wikidata for some).
- [ ] **Air quality**: now and annual average (OpenAQ, Open-Meteo air quality API).
- [ ] **Internet speed**: fixed/mobile Mbps (Ookla open data tiles).
- [ ] **Safety indicators**: overall, for women, LGBTQ+, traffic (Global Peace Index, ILGA, WHO road deaths; country level).
- [ ] **City guide key facts**: power plug/voltage, tap water, tipping, card acceptance, currency and exchange rate, English level, emergency number.
- [ ] **Near and similar cities**: nearest destinations and ones with similar metrics.
- [ ] **Personal score**: user-weighted ranking of the metrics above (saved in localStorage).
- [ ] **Trip tracker**: mark places visited and planned; show on the map.
- [ ] **Pros and cons / reviews**: probably out of scope (needs users); could summarise Wikivoyage instead.
- [ ] **Community (meetups, chat, dating)**: out of scope for a static personal map.

## 7. Technical debt

- [ ] Touch support: route previews and tooltips need hover; add tap equivalents.
- [ ] Try TypeScript 7 (native compiler) once the tooling around it settles.
- [ ] Bundle is ≈0.5 MB (Leaflet + React 19 + data); split route data or lazy-load if it grows with more airlines.
