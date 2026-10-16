# CLAUDE.md

European low-cost airline map (Ryanair, Wizz Air, Vueling, Volotea). Future goals: `PLAN.md`. Solo personal project: keep solutions simple and direct, no abstractions or config for imaginary needs.

- `front/`: Bun + TypeScript + Leaflet (npm) with small React components rendered into Leaflet controls. `src/map.ts` owns map state and wiring; `src/services/` holds Leaflet helpers; `src/components/` the React panels. Dev server uses `data/dev` fixtures (5 airports), production build uses `data/prod`.
- `data/`: Python (uv, polars, httpx, marimo). `build.py` regenerates `data/prod/*.json` from the fetchers in `airlines.py` plus OurAirports coordinates; `wikidata/` is exploration; `viz/app.py` is a Streamlit dashboard. Files whose first line is `import marimo` are marimo notebooks.
- UI uses a neutral palette (CSS variables in `front/assets/styles.css`); airline brand colors come only from `data/airlines.toml` and are used for trip legs, chips and filter swatches.
- Route price labels on the map are distance-based estimates (`estimateFlightPrice` in `front/src/utils.ts`). The trip planner and a dated itinerary price legs per airline ticked in the airline filter (`front/src/services/fare-service.ts`): Ryanair live from its unofficial fare-finder API (no key, CORS open), Wizz Air from `data/prod/fares-W6.json` (pre-fetched by `data/fares.py` / `mise run fares`, because Wizz blocks browser requests), Vueling and Volotea estimated as flying daily (no usable fare source). Real fares win over estimates. On localhost the page gets Ryanair fares through `front/serve.ts` (`front/fare-store.ts`), which records every calendar into gitignored `data/fares/YYYY-MM.json` and reuses it forever (`savedAt` keeps its age); `mise run offline` never calls Ryanair.

## Commands

- `mise run dev` / `mise run build` / `mise run ci` / `mise run data` (see `mise.toml`)
- Use `bun x` instead of `bunx`.

## Conventions

- TypeScript: no `any`; Biome formats and lints (`bun run lint:fix`).
- Python: modern types (`dict`, `X | None`), polars over pandas, httpx over requests, `pyproject.toml` only; ruff for lint/format, ty for types.
