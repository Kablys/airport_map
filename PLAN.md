# Plan

Future goals for the map. Tick items off as they land; add notes on sources that work or are blocked. Background data wish-list: [`data/README.md`](data/README.md).

## 1. More airlines

Done: Ryanair, Wizz Air, Vueling, Volotea (`data/airlines.py`).

- [ ] **Get more airlines**
  - [ ] **Pegasus (PC)**: firewall returns 403 to any non-browser client. The data exists (`web.flypgs.com/pegasus/port-matrix`, ≈750 direct routes); could export it once from the browser into `data/sources/`.
  - [ ] **Transavia (HV/TO)**: website behind Cloudflare; the official API (`api.transavia.com`) needs a free developer key. Most promising.
  - [ ] **easyJet (U2)**: only a per-airport, UK-market fare cache (`inspireme/getroutedata`), so routes are incomplete; other endpoints blocked by Akamai.
  - [ ] **Eurowings (EW)**: Cloudflare challenge on site and API.
  - [ ] **Norwegian (DY)**: "Are you human?" bot check (403).
  - [ ] **Jet2 (LS)**: connection reset or timeout on every request.
  - [ ] **Smartwings (QS)**: Cloudflare 403 on the site; API not looked for yet.
  - [ ] **SunExpress (XQ)**: Cloudflare 403 on the site; API not looked for yet.
  - [ ] **AJet (VF)**: site times out.
  - [ ] **airBaltic (BT)**: works (`airbaltic.com/api/orig-dest/en`, ≈250 direct routes); not added because it's a hybrid carrier, not low-cost. Decide.
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
