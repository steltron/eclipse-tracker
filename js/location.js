const DEFAULT_LOCATION = {
  lat: 33.1434,
  lon: -117.1661,
  name: 'San Marcos, CA'
};

export async function getUserLocation() {
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000
      });
    });
    const { latitude: lat, longitude: lon } = pos.coords;
    const name = await reverseGeocode(lat, lon);
    return { lat, lon, name };
  } catch {
    return { ...DEFAULT_LOCATION };
  }
}

export async function reverseGeocode(lat, lon) {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'User-Agent': 'EclipseTracker/1.0' } }
    );
    const data = await resp.json();
    const addr = data.address;
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const state = addr.state || '';
    return city && state ? `${city}, ${state}` : city || state || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  } catch {
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }
}

export async function searchLocation(query) {
  const coords = query.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (coords) {
    const lat = parseFloat(coords[1]);
    const lon = parseFloat(coords[2]);
    const name = await reverseGeocode(lat, lon);
    return { lat, lon, name };
  }
  const resp = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'EclipseTracker/1.0' } }
  );
  const results = await resp.json();
  if (results.length === 0) return null;
  const r = results[0];
  return {
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    name: r.display_name.split(',').slice(0, 2).join(',').trim()
  };
}

const LOCATION_CACHE_KEY = 'eclipse-tracker-locations';

function loadLocationCache() {
  try {
    return JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY)) || {};
  } catch { return {}; }
}

function saveLocationCache(cache) {
  localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cache));
}

export async function reverseGeocodeShort(lat, lon) {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=5`,
      { headers: { 'User-Agent': 'EclipseTracker/1.0' } }
    );
    const data = await resp.json();
    if (data.error) return coordsToOceanName(lat, lon);
    const addr = data.address;
    const city = addr.city || addr.town || addr.village || addr.county || addr.state || '';
    const country = addr.country || '';
    if (city && country) return `${city}, ${country}`;
    if (country) return country;
    return coordsToOceanName(lat, lon);
  } catch {
    return coordsToOceanName(lat, lon);
  }
}

function coordsToOceanName(lat, lon) {
  if (lat > 60) return 'Arctic';
  if (lat < -60) return 'Antarctic';
  if (lon > -30 && lon < 70 && lat > -40 && lat < 40) return 'Atlantic/Africa';
  if (lon >= 70 && lon < 180 && lat > -50) return 'Asia/Pacific';
  if (lon >= -180 && lon < -100 && lat > -50) return 'Pacific Ocean';
  if (lon >= -100 && lon < -30 && lat > -60) return 'Americas';
  if (lon >= 100 || lon < -100) return 'Pacific Ocean';
  return 'Atlantic Ocean';
}

export async function resolveEclipseLocations(eclipses, onUpdate) {
  const cache = loadLocationCache();
  let dirty = false;

  for (const e of eclipses) {
    if (e.category !== 'solar') continue;
    if (cache[e.id]) {
      e.locationName = cache[e.id];
      continue;
    }
    if (e.greatestEclipseLat == null) continue;
    await new Promise(r => setTimeout(r, 1100));
    const name = await reverseGeocodeShort(e.greatestEclipseLat, e.greatestEclipseLon);
    e.locationName = name;
    cache[e.id] = name;
    dirty = true;
    if (onUpdate) onUpdate();
  }

  if (dirty) saveLocationCache(cache);
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
