# Eurotrip Planner - European Low-Cost Flights Map

An interactive web application for planning multi-stop European trips using the route networks of Ryanair, Wizz Air, Vueling and Volotea. The application displays the airports they serve on an interactive map, with a per-airline filter, with estimated flight prices (distance-based, not live fares) and route visualization.

## Live Demo

<https://kablys.github.io/airport_map/>

## Development

```sh
mise run dev     # dev server with data/dev fixtures on :3000
mise run real    # real data on :4173; fares are fetched once, then kept in data/fares
mise run offline # real data, fares only from data/fares (no Ryanair calls)
mise run ci      # lint, type-check, unit + browser tests, build
mise run build   # production build into front/dist (uses data/prod)
```

### Trip search CLI

For trips the planner form can't express, describe the trip in JSON and search from the command line (production data, fares through `data/fares`). Fixed places with date windows, joined by flexible stopovers:

```sh
mise run trip -- query.json            # or inline: mise run trip -- '{"places": [...]}'
mise run trip -- query.json --offline  # cached fares only, no Ryanair calls
```

```json
{
  "places": [
    { "at": ["VNO"], "leave": ["2026-11-14", "2026-11-21"] },
    { "at": ["TFS", "TFN"], "arrive": ["2026-11-22", "2026-11-22"], "leave": ["2026-11-28", "2026-11-28"] },
    { "at": ["VNO"], "arrive": ["2026-11-29", "2026-12-06"] }
  ],
  "via": { "stops": [1, 3], "nights": [1, 4] },
  "distinctCountries": true
}
```

Every place but the first needs `arrive`, every place but the last `leave`; optional `nights: [min, max]` per place, `avoid` (city or country names) and `maxDetour` (default 1.5). Each result prints a map link that opens it as an itinerary. Searching every possible leg up front can take thousands of calendars, and Ryanair answers 403 after a few thousand requests, so legs start as estimates and only the leading trips' months are fetched, round by round, up to `--max-fetch` (default 200) per search: Ryanair's calendar on its routes, and [Travelpayouts](https://support.travelpayouts.com/hc/en-us/articles/203956163) (`grouped_prices`, cheapest direct fare per day seen by Aviasales users in the last days; free partner token in `TRAVELPAYOUTS_TOKEN`) on the others, or [Kiwi.com's MCP server](https://mcp.kiwi.com) (live, no key, one request per leg and day) without a token or where Travelpayouts has nothing. Legs on airlines without fares are estimated only on days `data/prod/schedules.json` says they fly. `--check` looks every shown leg up on Kiwi.com and prints its price, flight and booking link. Everything fetched is kept in `data/fares` (`YYYY-MM.json` for Ryanair, `travelpayouts.json`, `kiwi.json`).

Keys go in a gitignored `.env` at the repo root, which mise loads (`TRAVELPAYOUTS_TOKEN=…`). `.mcp.json` adds the Kiwi server to Claude Code sessions in this repo.

Leaflet and React come from npm and are bundled by Bun. `serve.ts` is the local server for all three: it bundles the page and proxies Ryanair fare calendars through `data/fares/YYYY-MM.json` (one line per route, `{"FROM-TO": {savedAt, fares}}`). Every search on a local server adds to those files (gitignored, local only). Stored calendars are reused however old they are, so delete a line or a month file to refetch it; a browser's earlier IndexedDB fare cache is copied in once on first load. To import calendars from elsewhere, `POST /api/fares` with `{"FROM-TO-YYYY-MM": {savedAt, fares}}` (newer wins), or drop month files into `data/fares/`. Browser tests (`tests/e2e.test.ts`) start their own server and drive Chrome with Puppeteer.

## Plans

See [PLAN.md](../PLAN.md).

## Resources

### Ryanair

- <https://en.wikipedia.org/wiki/List_of_Ryanair_destinations>
- <https://github.com/2BAD/ryanair>
- <https://github.com/cohaolain/ryanair-py>
- <https://www.ryanair.com/gb/en/map> _redirects_
- <https://www.ryanair.com/gb/en/fare-finder>

### Similar

- <https://www.flightradar24.com/data/airlines/fr-ryr/routes>
- <https://www.flightconnections.com/route-map-ryanair-fr> similar
- <https://www.flightsfrom.com/FR>
- <https://tripplanner.airtreks.com/> - similar, but requires requires submitting form
- <https://www.opodo.co.uk/flights/multistop/>
- <https://www.rome2rio.com/map/#trips/create>
- <https://roundtheworld.staralliance.com/staralliance/destinations.xhtml?tripId=1&tokenReference=185d-4882-a978-085afae9> - same as my idea
- <https://panflights.com/en/tour> - has traveling salesman solution

### Data

- <https://www.rome2rio.com/legal/data-sources/>
