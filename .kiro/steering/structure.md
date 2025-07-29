# Project Structure

## File Organization

```
/
├── .kiro/                    # Kiro IDE configuration
│   └── steering/            # AI assistant steering rules
├── .vscode/                 # VS Code workspace settings
├── index.html              # Main application entry point
├── map.js                  # Core map functionality and API integration
├── airports-data.js        # Static airport coordinates and route data
├── package.json           # Project metadata and npm scripts
└── Readme.md              # Project documentation
```

## Core Files

### `index.html`

- Single-page application entry point
- Contains all CSS styling inline in `<style>` tags
- Includes external CDN dependencies (Leaflet.js)
- Defines UI layout: header, map container, stats panel, search control

### `map.js`

- Main application logic and map initialization
- Leaflet map setup with OpenStreetMap tiles
- Airport marker creation and event handling
- Route visualization with pricing integration
- Ryanair API integration for real-time pricing
- Search functionality and UI interactions
- Price caching and fallback mechanisms

### `airports-data.js`

- Static data file containing:
  - `ryanairAirports` array: 200+ European airports with coordinates
  - `ryanairRoutes` object: Route connections between airports
- Data organized by country for better structure
- Each airport includes: name, IATA code, country, coordinates, city

## Code Organization Patterns

### Data Layer

- Airport data is centralized in `airports-data.js`
- Route connections defined as adjacency list structure
- API responses cached in Map objects for performance

### UI Layer

- Map interactions handled through Leaflet event system
- DOM manipulation for search results and statistics
- CSS-in-JS for dynamic styling (price colors, markers)

### Business Logic

- Price calculation with API integration and fallbacks
- Distance calculations using haversine formula
- Route visualization with color-coded pricing
- Search and filtering functionality

## Naming Conventions

- Use camelCase for JavaScript variables and functions
- Use kebab-case for CSS classes and IDs
- Use UPPER_CASE for constants and API endpoints
- Prefix global variables with descriptive context (e.g., `ryanairAirports`)

## Adding New Features

- Keep airport data updates in `airports-data.js`
- Add new map functionality to `map.js`
- UI styling goes in the `<style>` section of `index.html`
- Follow the existing event-driven pattern for interactions
