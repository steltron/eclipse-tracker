# Eclipse Tracker

A static website that shows every solar and lunar eclipse for the next 30 years (2026–2056), ranked by how travel-worthy each one is from your location.

**Live site:** [steltron.github.io/eclipse-tracker](https://steltron.github.io/eclipse-tracker/)

## Features

- **All solar eclipses worldwide** — total, annular, and partial — with distance to the path of totality from your location
- **Total and partial lunar eclipses** — filtered by local visibility (moon above horizon), with global display for travel awareness
- **Proximity scoring** — each eclipse is labeled "Visible from home!", "Short trip", "US road trip", "Flight away", or "Far away" based on distance to the nearest path point
- **Eclipse path maps** — interactive Leaflet maps showing the path of totality/annularity, center line, and a distance line from your location (34 paths from NASA data)
- **Path regions** — countries and cities the eclipse path crosses (e.g., "Greenland → Atlantic Ocean → Spain")
- **Eclipse diagrams** — inline SVG showing how the eclipse looks *from your location*, not at global maximum. Eclipses not visible from home are grayed out with a "not visible" label
- **Google Calendar integration** — one-click calendar events with configurable guest list (stored in localStorage)
- **Weather forecasts** — cloud cover, temperature, and precipitation for eclipses within 10 days (Open-Meteo API)
- **Travel-worthiness ranking** — total solar (1) > annular solar (2) > partial solar (3) > total lunar (4) > partial lunar (5)
- **Location search** — defaults to San Marcos, CA; change to any city or coordinates

## How It Works

Everything runs client-side in the browser. No server, no API keys, no accounts.

| Component | Source |
|-----------|--------|
| Eclipse computation | [astronomy-engine](https://github.com/cosinekitty/astronomy) (116KB) |
| Eclipse path data | Pre-scraped from [NASA Eclipse Website](https://eclipse.gsfc.nasa.gov/) |
| Maps | [Leaflet](https://leafletjs.com/) + OpenStreetMap tiles |
| Weather | [Open-Meteo](https://open-meteo.com/) (free, no API key) |
| Geocoding | [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap) |
| Calendar | Google Calendar URL scheme (no API key) |

## Running Locally

```bash
python3 -m http.server 8765
# Open http://localhost:8765
```

## Regenerating Data

Eclipse path coordinates and region labels are pre-computed and stored in `data/eclipse-paths.js`. To regenerate:

```bash
# Scrape NASA path tables (requires curl)
node scripts/scrape-nasa-paths.js

# Enrich with country/city names along each path
node scripts/enrich-path-regions.js
```

NASA publishes path data through ~2048. Eclipses after that use the greatest-eclipse point for distance calculation instead of the full path.

## License

MIT
