# Technology Stack

## Frontend Technologies
- **HTML5** - Semantic markup with responsive design
- **CSS3** - Custom styling with Flexbox layouts and responsive design
- **Vanilla JavaScript** - No frameworks, pure ES2020+ JavaScript
- **Leaflet.js** - Interactive mapping library for map visualization
- **OpenStreetMap** - Tile provider for map data

## APIs & Data Sources
- **Ryanair Booking API** - Real-time flight pricing and availability
- **Ryanair Cheapest Fares API** - Alternative pricing endpoint
- **Static Airport Data** - Hardcoded airport coordinates and route connections

## Architecture Patterns
- **Client-side only** - No backend server, runs entirely in browser
- **Event-driven** - Map interactions trigger route visualization
- **Caching strategy** - Flight prices cached for 30 minutes to reduce API calls
- **Fallback pricing** - Distance-based estimation when API unavailable

## Development Commands

### Local Development
- Don't run servers on your own directly, instead create ways to test it.

### File Structure
- `index.html` - Main application entry point
- `map.js` - Core map functionality and API integration
- `airports-data.js` - Static airport and route data
- `package.json` - Project metadata and scripts

## Code Style Guidelines
- Use ES2020+ features (const/let, arrow functions, async/await)
- Prefer vanilla JavaScript over frameworks
- Keep functions focused and modular
- Use descriptive variable names
- Comment complex logic, especially API integrations
- Handle API failures gracefully with fallbacks