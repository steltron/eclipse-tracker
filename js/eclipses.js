import { haversineDistance } from './location.js';

const A = window.Astronomy;

export function computeSolarEclipses(lat, lon, startDate, endDate) {
  const eclipses = [];
  const observer = new A.Observer(lat, lon, 0);
  let search = A.SearchGlobalSolarEclipse(A.MakeTime(startDate));

  while (search.peak.date < endDate) {
    const eclipse = buildSolarEclipse(search, observer);
    eclipses.push(eclipse);
    search = A.NextGlobalSolarEclipse(search.peak);
  }
  return eclipses;
}

function buildSolarEclipse(global, observer) {
  const peakDate = global.peak.date;
  const type = mapSolarKind(global.kind);
  const dateStr = peakDate.toISOString().slice(0, 10);

  let obscuration = null;
  let localStart = null;
  let localEnd = null;
  let locallyVisible = false;
  let localTotality = null;

  try {
    const searchStart = A.MakeTime(new Date(peakDate.getTime() - 6 * 3600000));
    const local = A.SearchLocalSolarEclipse(searchStart, observer);
    const localPeakStr = local.peak.time.date.toISOString().slice(0, 10);
    if (localPeakStr === dateStr) {
      locallyVisible = true;
      obscuration = local.obscuration;
      localStart = local.partial_begin.time.date;
      localEnd = local.partial_end.time.date;
      if (local.total_begin && local.total_end &&
          local.total_begin.time && local.total_end.time) {
        localTotality = {
          totalStart: local.total_begin.time.date,
          totalEnd: local.total_end.time.date
        };
      }
    }
  } catch {
    // not visible from this location
  }

  const startTime = localStart || new Date(peakDate.getTime() - 90 * 60000);
  const endTime = localEnd || new Date(peakDate.getTime() + 90 * 60000);
  const durationMinutes = Math.round((endTime - startTime) / 60000);

  return {
    id: `solar-${dateStr}`,
    category: 'solar',
    type,
    date: peakDate,
    peakTime: peakDate,
    startTime,
    endTime,
    durationMinutes,
    magnitude: global.obscuration || null,
    obscuration,
    locallyVisible,
    localTotality,
    hasPath: type !== 'partial',
    distanceKm: null,
    proximityLabel: null,
    travelPriority: type === 'total' ? 1 : type === 'annular' ? 2 : 3,
    greatestEclipseLat: global.latitude,
    greatestEclipseLon: global.longitude,
  };
}

export function computeLunarEclipses(lat, lon, startDate, endDate) {
  const eclipses = [];
  const observer = new A.Observer(lat, lon, 0);
  let search = A.SearchLunarEclipse(A.MakeTime(startDate));

  while (search.peak.date < endDate) {
    const type = mapLunarKind(search.kind);
    if (type !== 'penumbral') {
      const eclipse = buildLunarEclipse(search, observer, type);
      eclipses.push(eclipse);
    }
    search = A.NextLunarEclipse(search.peak);
  }
  return eclipses;
}

function getMoonAltitude(time, observer) {
  const eq = A.Equator('Moon', time, observer, true, true);
  const hz = A.Horizon(time, observer, eq.ra, eq.dec, 'normal');
  return hz.altitude;
}

function buildLunarEclipse(lunar, observer, type) {
  const peakDate = lunar.peak.date;
  const dateStr = peakDate.toISOString().slice(0, 10);

  const sdPartialMs = (lunar.sd_partial || 0) * 60000;
  const startTime = new Date(peakDate.getTime() - sdPartialMs);
  const endTime = new Date(peakDate.getTime() + sdPartialMs);
  const durationMinutes = Math.round((endTime - startTime) / 60000);

  let locallyVisible = false;
  try {
    const altPeak = getMoonAltitude(lunar.peak, observer);
    if (altPeak > 0) {
      locallyVisible = true;
    } else {
      const altStart = getMoonAltitude(A.MakeTime(startTime), observer);
      const altEnd = getMoonAltitude(A.MakeTime(endTime), observer);
      locallyVisible = altStart > 0 || altEnd > 0;
    }
  } catch {
    // assume not visible
  }

  return {
    id: `lunar-${dateStr}`,
    category: 'lunar',
    type,
    date: peakDate,
    peakTime: peakDate,
    startTime,
    endTime,
    durationMinutes,
    magnitude: lunar.obscuration || null,
    obscuration: lunar.obscuration || null,
    locallyVisible,
    localTotality: null,
    hasPath: false,
    distanceKm: null,
    proximityLabel: locallyVisible ? 'Visible from home' : 'Not visible locally',
    travelPriority: type === 'total' ? 4 : 5,
  };
}

export function computeDistances(eclipses, userLat, userLon, pathData) {
  for (const eclipse of eclipses) {
    if (eclipse.category === 'lunar') continue;

    const dateKey = eclipse.date.toISOString().slice(0, 10);
    const path = pathData[dateKey];

    if (path && path.centerLine && path.centerLine.coordinates.length > 0) {
      let minDist = Infinity;
      for (const coord of path.centerLine.coordinates) {
        const d = haversineDistance(userLat, userLon, coord[1], coord[0]);
        if (d < minDist) minDist = d;
      }
      eclipse.distanceKm = Math.round(minDist);
    } else if (eclipse.greatestEclipseLat != null && eclipse.greatestEclipseLon != null) {
      eclipse.distanceKm = Math.round(
        haversineDistance(userLat, userLon, eclipse.greatestEclipseLat, eclipse.greatestEclipseLon)
      );
    } else if (eclipse.locallyVisible) {
      eclipse.distanceKm = 0;
    } else {
      eclipse.distanceKm = null;
    }

    eclipse.proximityLabel = getProximityLabel(eclipse.distanceKm);
  }
}

function getProximityLabel(distKm) {
  if (distKm === null || distKm === undefined) return 'Unknown distance';
  if (distKm <= 50) return 'Visible from home!';
  if (distKm <= 500) return 'Short trip';
  if (distKm <= 2000) return 'US road trip';
  if (distKm <= 5000) return 'Flight away';
  return 'Far away';
}

export function mergeAndSort(solarEclipses, lunarEclipses) {
  return [...solarEclipses, ...lunarEclipses].sort((a, b) => a.date - b.date);
}

function mapSolarKind(kind) {
  const map = { partial: 'partial', annular: 'annular', total: 'total', hybrid: 'total' };
  return map[kind] || kind || 'partial';
}

function mapLunarKind(kind) {
  const map = { penumbral: 'penumbral', partial: 'partial', total: 'total' };
  return map[kind] || kind || 'penumbral';
}
