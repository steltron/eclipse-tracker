import { getUserLocation, searchLocation, resolveEclipseLocations } from './location.js';
import { computeSolarEclipses, computeLunarEclipses, computeDistances, mergeAndSort } from './eclipses.js';
import { buildCalendarUrl } from './calendar.js';
import { getEmails, addEmail, removeEmail } from './settings.js';
import { enrichWithWeather } from './weather.js';
import { showEclipseMap, closeMap } from './map.js';
import { eclipsePaths } from '../data/eclipse-paths.js';

let currentLocation = null;
let allEclipses = [];
let activeFilter = 'all';

async function init() {
  currentLocation = await getUserLocation();
  document.getElementById('location-name').textContent = currentLocation.name;

  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 30);

  const solar = computeSolarEclipses(currentLocation.lat, currentLocation.lon, startDate, endDate);
  const lunar = computeLunarEclipses(currentLocation.lat, currentLocation.lon, startDate, endDate);
  allEclipses = mergeAndSort(solar, lunar);
  computeDistances(allEclipses, currentLocation.lat, currentLocation.lon, eclipsePaths);

  document.getElementById('loading').classList.add('hidden');
  renderCountdown();
  renderEclipseList();
  renderEmailSettings();

  enrichWithWeather(allEclipses, currentLocation.lat, currentLocation.lon).then(() => {
    renderEclipseList();
  });

  resolveEclipseLocations(allEclipses, () => renderEclipseList());
}

function renderCountdown() {
  const bar = document.getElementById('countdown-bar');
  const now = new Date();
  const next = allEclipses.find(e => e.date > now);
  if (!next) {
    bar.textContent = '';
    return;
  }
  const days = Math.ceil((next.date - now) / 86400000);
  const typeLabel = next.type.charAt(0).toUpperCase() + next.type.slice(1);
  const catLabel = next.category === 'solar' ? 'Solar' : 'Lunar';
  bar.innerHTML = `Next eclipse: <strong>${typeLabel} ${catLabel}</strong> in <strong>${days} day${days !== 1 ? 's' : ''}</strong> (${next.date.toLocaleDateString()})`;
  if (next.proximityLabel) {
    bar.innerHTML += ` &mdash; ${next.proximityLabel}`;
  }
}

function getFilteredEclipses() {
  switch (activeFilter) {
    case 'solar':
      return allEclipses.filter(e => e.category === 'solar');
    case 'lunar':
      return allEclipses.filter(e => e.category === 'lunar');
    case 'travel':
      return allEclipses.filter(e => {
        if (e.category === 'solar' && (e.type === 'total' || e.type === 'annular') && (e.distanceKm === null || e.distanceKm <= 5000)) return true;
        if (e.category === 'lunar' && e.type === 'total' && e.locallyVisible) return true;
        return false;
      });
    default:
      return allEclipses;
  }
}

function renderEclipseList() {
  const container = document.getElementById('eclipse-list');
  const emptyState = document.getElementById('empty-state');
  const filtered = getFilteredEclipses();

  if (filtered.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  container.innerHTML = filtered.map(e => renderCard(e)).join('');

  container.querySelectorAll('.btn-calendar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const eclipse = allEclipses.find(e => e.id === id);
      if (eclipse) {
        window.open(buildCalendarUrl(eclipse, currentLocation.name), '_blank');
      }
    });
  });

  container.querySelectorAll('.btn-map').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const eclipse = allEclipses.find(e => e.id === id);
      if (eclipse) {
        showEclipseMap(eclipse, currentLocation.lat, currentLocation.lon, eclipsePaths);
      }
    });
  });

  const now = new Date();
  const nextIdx = filtered.findIndex(e => e.date > now);
  if (nextIdx > 0) {
    const cards = container.querySelectorAll('.eclipse-card');
    if (cards[nextIdx]) {
      cards[nextIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function renderCard(eclipse) {
  const typeLabel = eclipse.type.charAt(0).toUpperCase() + eclipse.type.slice(1);
  const catLabel = eclipse.category === 'solar' ? 'Solar' : 'Lunar';
  const isPast = eclipse.date < new Date();

  let cardClass = 'eclipse-card';
  cardClass += ` eclipse-${eclipse.category}`;
  cardClass += ` eclipse-${eclipse.type}`;
  if (eclipse.type === 'total' && eclipse.category === 'solar' && eclipse.distanceKm !== null && eclipse.distanceKm <= 2000) {
    cardClass += ' eclipse-highlight';
  }
  if (eclipse.type === 'total' && eclipse.category === 'lunar' && eclipse.locallyVisible) {
    cardClass += ' eclipse-highlight-lunar';
  }
  if (eclipse.category === 'solar' && eclipse.type === 'partial') {
    cardClass += ' eclipse-muted';
  }
  if (eclipse.category === 'lunar' && !eclipse.locallyVisible) {
    cardClass += ' eclipse-dim';
  }
  if (isPast) {
    cardClass += ' eclipse-past';
  }

  let distBadge = '';
  if (eclipse.proximityLabel && eclipse.category === 'solar') {
    const distCls = getDistanceClass(eclipse.distanceKm);
    const locLabel = eclipse.locationName ? ` &middot; ${eclipse.locationName}` : '';
    distBadge = `<span class="badge badge-distance ${distCls}">${eclipse.proximityLabel}${eclipse.distanceKm != null ? ' (' + eclipse.distanceKm.toLocaleString() + ' km)' : ''}${locLabel}</span>`;
  }
  if (eclipse.category === 'lunar') {
    const visCls = eclipse.locallyVisible ? 'badge-visible' : 'badge-not-visible';
    distBadge = `<span class="badge ${visCls}">${eclipse.locallyVisible ? 'Visible from home' : 'Not visible locally'}</span>`;
  }

  let weatherHtml = '';
  if (eclipse.weather) {
    const w = eclipse.weather;
    weatherHtml = `
      <div class="weather-badge ${w.condition.cls}">
        <span class="weather-label">${w.condition.label}</span>
        <span class="weather-detail">${w.cloudCover}% clouds &middot; ${w.temperature}&deg;C &middot; ${w.precipProbability}% precip</span>
      </div>`;
  }

  let detailsHtml = '';
  if (eclipse.obscuration != null) {
    detailsHtml += `<span class="detail">Obscuration: ${(eclipse.obscuration * 100).toFixed(1)}%</span>`;
  }
  if (eclipse.magnitude != null) {
    detailsHtml += `<span class="detail">Magnitude: ${eclipse.magnitude.toFixed(3)}</span>`;
  }
  detailsHtml += `<span class="detail">Duration: ${formatDuration(eclipse.durationMinutes)}</span>`;

  const diagram = renderEclipseDiagram(eclipse);
  const pathRegions = getPathRegions(eclipse, eclipsePaths);
  const pathHtml = pathRegions ? `<div class="card-path">Path: ${pathRegions}</div>` : '';

  return `
    <div class="${cardClass}">
      <div class="card-body">
        <div class="card-info">
          <div class="card-header">
            <span class="card-type">${typeLabel} ${catLabel} Eclipse</span>
            ${eclipse.type === 'total' ? '<span class="badge badge-total">TOTAL</span>' : ''}
          </div>
          <div class="card-date">${eclipse.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div class="card-time">Peak: ${eclipse.peakTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</div>
          <div class="card-details">${detailsHtml}</div>
          ${pathHtml}
          <div class="card-badges">${distBadge}${weatherHtml}</div>
          <div class="card-actions">
            <button class="btn btn-calendar" data-id="${eclipse.id}">Add to Calendar</button>
            <button class="btn btn-map" data-id="${eclipse.id}">Show Map</button>
          </div>
        </div>
        <div class="card-diagram">${diagram}</div>
      </div>
    </div>`;
}

function renderEclipseDiagram(eclipse) {
  const size = 48;
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;

  if (eclipse.category === 'solar') {
    const localObs = eclipse.obscuration;
    const isLocallyVisible = eclipse.locallyVisible && localObs > 0;
    const sunColor = isLocallyVisible ? '#fbbf24' : '#e5e7eb';
    const moonColor = isLocallyVisible ? '#1e293b' : '#9ca3af';
    const opacity = isLocallyVisible ? 1 : 0.5;

    if (isLocallyVisible && localObs >= 0.99) {
      const coronaColor = '#fef3c7';
      return `<svg class="eclipse-diagram" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" opacity="${opacity}">
        <circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="none" stroke="${coronaColor}" stroke-width="3" opacity="0.6"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="${sunColor}"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="${moonColor}"/>
      </svg>`;
    }

    const displayObs = isLocallyVisible ? localObs : (eclipse.magnitude || 0.5);
    const overlap = r * 2 * (1 - displayObs);
    const moonX = cx + overlap;

    let label = '';
    if (!isLocallyVisible) {
      label = `<text x="${cx}" y="${size - 1}" text-anchor="middle" font-size="7" fill="#9ca3af">not visible</text>`;
    }

    return `<svg class="eclipse-diagram" width="${size}" height="${size + (isLocallyVisible ? 0 : 8)}" viewBox="0 0 ${size} ${size + (isLocallyVisible ? 0 : 8)}" opacity="${opacity}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${sunColor}"/>
      <circle cx="${moonX}" cy="${cy}" r="${r}" fill="${moonColor}"/>
      ${label}
    </svg>`;
  }

  // Lunar eclipse
  const isVisible = eclipse.locallyVisible;
  const moonColor = isVisible ? '#d1d5db' : '#e5e7eb';
  const shadowColor = eclipse.type === 'total' ? (isVisible ? '#991b1b' : '#d4a0a0') : (isVisible ? '#7f1d1d' : '#c4a0a0');
  const opacity = isVisible ? 1 : 0.5;
  const mag = eclipse.obscuration || 0.5;
  const overlap = mag >= 0.99 ? 0 : r * 2 * (1 - mag);
  const shadowX = cx - overlap;

  let label = '';
  if (!isVisible) {
    label = `<text x="${cx}" y="${size - 1}" text-anchor="middle" font-size="7" fill="#9ca3af">not visible</text>`;
  }

  return `<svg class="eclipse-diagram" width="${size}" height="${size + (isVisible ? 0 : 8)}" viewBox="0 0 ${size} ${size + (isVisible ? 0 : 8)}" opacity="${opacity}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${moonColor}"/>
    <circle cx="${shadowX}" cy="${cy}" r="${r}" fill="${shadowColor}" opacity="0.75"/>
    ${label}
  </svg>`;
}

function getPathRegions(eclipse, pathData) {
  const dateKey = eclipse.date.toISOString().slice(0, 10);
  const path = pathData[dateKey];
  if (!path || !path.regions || path.regions.length === 0) return '';
  const filtered = path.regions.filter(r => r !== 'Ocean');
  if (filtered.length === 0) return '';
  return filtered.join(' → ');
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getDistanceClass(distKm) {
  if (distKm === null || distKm === undefined) return 'dist-unknown';
  if (distKm <= 50) return 'dist-home';
  if (distKm <= 500) return 'dist-short';
  if (distKm <= 2000) return 'dist-road';
  if (distKm <= 5000) return 'dist-flight';
  return 'dist-far';
}

function renderEmailSettings() {
  const container = document.getElementById('email-entries');
  const emails = getEmails();
  container.innerHTML = emails.map(email => `
    <div class="email-entry">
      <span>${email}</span>
      <button class="btn-remove" data-email="${email}">&times;</button>
    </div>
  `).join('');

  container.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeEmail(btn.dataset.email);
      renderEmailSettings();
    });
  });
}

// Event listeners
document.getElementById('change-location-btn').addEventListener('click', () => {
  document.getElementById('location-search').classList.toggle('hidden');
  document.getElementById('location-input').focus();
});

document.getElementById('location-cancel-btn').addEventListener('click', () => {
  document.getElementById('location-search').classList.add('hidden');
});

document.getElementById('location-search-btn').addEventListener('click', async () => {
  const input = document.getElementById('location-input');
  const query = input.value.trim();
  if (!query) return;
  const result = await searchLocation(query);
  if (result) {
    currentLocation = result;
    document.getElementById('location-name').textContent = result.name;
    document.getElementById('location-search').classList.add('hidden');
    input.value = '';

    document.getElementById('loading').classList.remove('hidden');
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 30);
    const solar = computeSolarEclipses(result.lat, result.lon, startDate, endDate);
    const lunar = computeLunarEclipses(result.lat, result.lon, startDate, endDate);
    allEclipses = mergeAndSort(solar, lunar);
    computeDistances(allEclipses, result.lat, result.lon, eclipsePaths);
    document.getElementById('loading').classList.add('hidden');
    renderCountdown();
    renderEclipseList();
    enrichWithWeather(allEclipses, result.lat, result.lon).then(() => renderEclipseList());
    resolveEclipseLocations(allEclipses, () => renderEclipseList());
  }
});

document.getElementById('location-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('location-search-btn').click();
});

document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('settings-panel').classList.toggle('hidden');
});

document.getElementById('add-email-btn').addEventListener('click', () => {
  const input = document.getElementById('new-email-input');
  const email = input.value.trim();
  if (email && email.includes('@')) {
    addEmail(email);
    input.value = '';
    renderEmailSettings();
  }
});

document.getElementById('new-email-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('add-email-btn').click();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderEclipseList();
  });
});

document.getElementById('map-close-btn').addEventListener('click', closeMap);

init();
