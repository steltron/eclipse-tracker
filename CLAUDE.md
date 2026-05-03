# Eclipse Tracker

Static website showing all solar and lunar eclipses for 2026-2056, ranked by travel-worthiness and proximity.

## Tech Stack

- Vanilla HTML/CSS/JS with ES modules (no framework, no bundler)
- **astronomy-engine** (CDN): client-side eclipse computation
- **Leaflet.js** + OpenStreetMap: interactive eclipse path maps
- **Open-Meteo API**: weather forecast for eclipses within 10 days
- **Pre-computed GeoJSON** from NASA path tables (34 eclipse paths)

## Running Locally

```bash
python3 -m http.server 8765
# Open http://localhost:8765
```

## Regenerating Eclipse Path Data

```bash
node scripts/scrape-nasa-paths.js
```

Fetches NASA path tables via curl and outputs `data/eclipse-paths.js`. NASA only publishes path data through ~2048; later eclipses use the greatest-eclipse point for distance calculation.

## Key Files

- `js/eclipses.js` — Core computation: global solar + lunar eclipse iteration, local visibility, distance scoring
- `js/app.js` — Main orchestrator: renders cards, filters, location changes
- `js/map.js` — Leaflet map modal with eclipse path overlay
- `js/calendar.js` — Google Calendar URL builder with configurable email list
- `js/settings.js` — localStorage-backed email preferences
- `js/weather.js` — Open-Meteo forecast for upcoming eclipses
- `data/eclipse-paths.js` — Pre-computed GeoJSON paths (auto-generated)
