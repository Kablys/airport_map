# Regenerate

```sh
uv run python build.py      # or `mise run data`; rewrites prod/{airports,routes,airlines,schedules}.json (~10 min)
uv run python schedules.py  # or `mise run schedules`; adds easyJet's timetable to prod/schedules.json (~45 min)
```

Route sources, in order of trust:

- **Airlines' own JSON** (`airlines.py`, the endpoints their websites use): Ryanair, Wizz Air, Vueling, Volotea, easyJet (`inspireme/getroutedata`, one request per airport with a browser User-Agent) and Pegasus (`port-matrix`, one request, needs the `x-platform: web` header).
- **Published timetables**: Transavia (HV and TO) from Air France-KLM's season timetable in IATA SSIM format on [data.gouv.fr](https://www.data.gouv.fr/datasets/programme-des-vols-air-france/) (licence not specified; ~80 MB, cached in `.cache/`). Lufthansa Group airlines (Discover, 4Y) from the [Lufthansa Open API](https://developer.lufthansa.com/) when `LH_CLIENT_ID` / `LH_CLIENT_SECRET` are set; its registration was on hold in October 2026 and it doesn't list Eurowings.
- **Wikipedia** (`wikipedia.py`): for airlines whose sites block scripts (Eurowings, Norwegian, Jet2, AJet, SunExpress, Smartwings, Iberia Express, Aeroitalia, FlyOne, HiSky), the "Airlines and destinations" table of every European airport article (≈650 articles in ~15 batched requests), without charter-only and ended routes. Article links map to IATA through OurAirports' `wikipedia_link`. Checked against easyJet's own data: 95% of routes agree; the rest are mostly seasonal. Text is CC BY-SA 4.0. To add an airline, add its article title and IATA code to `WIKIPEDIA_AIRLINES` in `build.py` and colors to `airlines.toml`.

Airport coordinates and countries come from [OurAirports](https://ourairports.com/data/) (public domain) because airline APIs have had wrong ones. `prod/routes.json` maps origin → destination → airline codes. Airline names and brand colors are configured in `airlines.toml` (every airline needs an entry) and copied into `prod/airlines.json`. Review `git diff prod/` before committing.

`prod/schedules.json` maps airline → route → month → ISO weekdays flown (`"135"` = Mon, Wed, Fri), for airlines with a timetable source (Transavia, easyJet, Lufthansa Group). The trip CLI uses it to estimate fares only on days an airline flies. Ryanair and Wizz Air don't need it: their fare calendars already say which days they fly.

`fares.py` (`mise run fares`) pre-fetches Wizz Air fare calendars for the next 12 weeks into `prod/fares-W6.json`, because Wizz's fare API rejects browser requests; the map fetches Ryanair fares live. Wizz throttles bursts, so it runs at one request a second (~1.5–4 h) and resumes from `.cache/` if re-run the same day.

Airlines not included yet, and why, are tracked in [PLAN.md](../PLAN.md#1-more-airlines).

# Data to get

- Geo
  - Coordinates
  - Area
  - Height
  - Population
- Economy
  - GDP
  - Salary
  - Unemployment
- International
  - Zones (EU, Schengen, etc.)
  - Borders
  - Currency (and exchange rate)
  - Languages
  - Coastal/Landlocked
  - Passport
- Transportation
  - Roads
  - Rails
  - Airports
  - Ports
- Touristy types: (Beach, hiking, history, amusement, shopping, spa, culture, etc.)
- Climate/Weather
- Living
  - Drinking water
  - Electricity/sockets
  - Internet
  - Air pollution
  - Crime
  - Health services


  ## **Geography & Nature**

* Coordinates (lat/lon)
* Area (city, metro)
* Elevation above sea level
* Population (city, metro, density)
* Nearby mountains, rivers, lakes
* Natural landmarks
* Time zone(s)
* Sunrise/sunset times (seasonal)

## **Economy & Cost of Living**

* GDP per capita
* Average salary
* Unemployment rate
* Cost of living index
* Price of essentials (food, rent, transportation)
* Local tax rates (VAT, tourist tax)
* Tipping culture

## **International & Legal**

* Political affiliation (EU, Schengen, Commonwealth, etc.)
* Neighboring countries / borders
* Currency (with live exchange rates)
* Official and widely spoken languages
* Coastal vs. landlocked
* Visa requirements by passport
* Driving side (left/right)
* Local laws (drinking age, smoking rules, dress codes)
* Emergency phone numbers
* Embassies & consulates (locations and contact info)

## **Transportation & Accessibility**

* Road quality & density
* Rail network
* Number of airports + the nearest major hub
* Public transit coverage & fares
* Ferry/port access
* Rideshare availability (Uber, Bolt, etc.)
* Bike-friendliness
* Walkability score
* Rentable mobility options (e-scooters, e-bikes, car shares)

## **Tourism & Attractions**

* Popular attractions (landmarks, museums, events)
* Types of tourism:

  * Beach & coastal leisure
  * Hiking & nature
  * History & heritage
  * Cultural immersion
  * Food & gastronomy
  * Shopping & markets
  * Spa & wellness
  * Adventure sports
  * Family & amusement parks
  * Religious & pilgrimage tourism
* UNESCO heritage sites
* National parks & nature reserves
* Local cuisine highlights
* Nightlife & entertainment areas

## **Events Calendar**

* National holidays
* Major festivals (music, film, cultural)
* Religious events & pilgrimages
* Sporting events
* Seasonal markets & fairs
* Conferences & expos

## **Climate & Weather**

* Average monthly temperature & precipitation
* Best travel seasons
* UV index
* Air humidity
* Extreme weather risks (storms, earthquakes, floods)

## **Living & Safety**

* Drinking water safety
* Alcohol availability & rules
* Electricity voltage & plug type
* Internet speed & mobile coverage
* Air pollution index
* Crime rate & safety index
* Healthcare quality & hospital locations
* Availability of pharmacies & 24/7 clinics

## **Culture & Society**

* Local etiquette & customs
* Dress norms
* Public holidays
* Religion(s) & places of worship
* Local language phrases
* Popular sports & activities

## **Digital & Remote Work Friendly Data**

* Co-working spaces count & locations
* Digital nomad visa availability
* Cost of coworking
* Average coffee price (nomad indicator)
* Noise levels (city center vs. outskirts)

---

## **Data Acquisition Matrix**

| Category                       | Data Point                                          | Possible Data Sources (Free/Low Cost)                 |
| ------------------------------ | --------------------------------------------------- | ----------------------------------------------------- |
| Geography & Nature             | Coordinates, area, elevation, population            | Wikidata, GeoNames, OpenStreetMap                     |
| Economy & Cost of Living       | GDP, salary, unemployment                           | World Bank, Numbeo, OECD                              |
| International & Legal          | Borders, currency, languages, visa rules, embassies | Wikidata, Travel.state.gov, OpenVisa API              |
| Transportation & Accessibility | Airports, transit, e-scooters, walkability          | OpenStreetMap, TransitLand, CityBikes API, GBFS feeds |
| Tourism & Attractions          | Attractions, tourism types, UNESCO sites            | Wikivoyage, Triposo API, UNESCO database              |
| Events Calendar                | Festivals, religious events, expos                  | Eventbrite API, PredictHQ, local tourism boards       |
| Climate & Weather              | Weather stats, extreme risks                        | Open-Meteo API, NOAA, WorldClim                       |
| Living & Safety                | Water, pollution, crime rates                       | Numbeo, WHO, Our World in Data                        |
| Culture & Society              | Etiquette, holidays, sports                         | Wikivoyage, government tourism sites                  |
| Digital Nomad Data             | Coworking, internet speed                           | NomadList API, Ookla Speedtest data                   |

---
