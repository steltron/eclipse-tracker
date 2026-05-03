let mapInstance = null;

export function showEclipseMap(eclipse, userLat, userLon, pathData) {
  const modal = document.getElementById('map-modal');
  const title = document.getElementById('map-title');
  const typeLabel = eclipse.type.charAt(0).toUpperCase() + eclipse.type.slice(1);
  const catLabel = eclipse.category === 'solar' ? 'Solar' : 'Lunar';
  title.textContent = `${typeLabel} ${catLabel} Eclipse — ${eclipse.date.toLocaleDateString()}`;
  modal.classList.remove('hidden');

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  mapInstance = L.map('map-container').setView([userLat, userLon], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(mapInstance);

  const userMarker = L.marker([userLat, userLon])
    .addTo(mapInstance)
    .bindPopup('Your location')
    .openPopup();

  const dateKey = eclipse.date.toISOString().slice(0, 10);
  const path = pathData[dateKey];
  const bounds = L.latLngBounds([[userLat, userLon]]);
  let hasPathDetail = false;

  if (path) {
    if (path.pathPolygon) {
      const coords = path.pathPolygon.coordinates[0].map(c => [c[1], c[0]]);
      L.polygon(coords, {
        color: eclipse.type === 'total' ? '#f59e0b' : '#f97316',
        fillOpacity: 0.25,
        weight: 1,
      }).addTo(mapInstance);
      coords.forEach(c => bounds.extend(c));
      hasPathDetail = true;
    }

    if (path.centerLine) {
      const lineCoords = path.centerLine.coordinates.map(c => [c[1], c[0]]);
      L.polyline(lineCoords, {
        color: eclipse.type === 'total' ? '#b45309' : '#c2410c',
        weight: 2,
        dashArray: '8 4',
      }).addTo(mapInstance);
      lineCoords.forEach(c => bounds.extend(c));
      hasPathDetail = true;

      let nearestPoint = null;
      let minDist = Infinity;
      for (const coord of path.centerLine.coordinates) {
        const d = Math.hypot(coord[1] - userLat, coord[0] - userLon);
        if (d < minDist) {
          minDist = d;
          nearestPoint = [coord[1], coord[0]];
        }
      }
      if (nearestPoint) {
        L.polyline([[userLat, userLon], nearestPoint], {
          color: '#6366f1',
          weight: 2,
          dashArray: '4 4',
          opacity: 0.7,
        }).addTo(mapInstance);
        L.circleMarker(nearestPoint, {
          radius: 5,
          color: '#6366f1',
          fillColor: '#6366f1',
          fillOpacity: 0.8,
        }).addTo(mapInstance)
          .bindPopup(`Nearest path point<br>${eclipse.distanceKm != null ? eclipse.distanceKm.toLocaleString() + ' km away' : ''}`);
      }
    }
  }

  if (!hasPathDetail && eclipse.category === 'solar' &&
      eclipse.greatestEclipseLat != null && eclipse.greatestEclipseLon != null) {
    const gLat = eclipse.greatestEclipseLat;
    const gLon = eclipse.greatestEclipseLon;

    const eclipseIcon = L.divIcon({
      className: 'greatest-eclipse-marker',
      html: `<div style="
        width:18px;height:18px;border-radius:50%;
        background:${eclipse.type === 'total' ? '#f59e0b' : eclipse.type === 'annular' ? '#f97316' : '#94a3b8'};
        border:2px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    L.marker([gLat, gLon], { icon: eclipseIcon })
      .addTo(mapInstance)
      .bindPopup(`Greatest eclipse<br>${typeLabel} ${catLabel}<br>Magnitude: ${eclipse.magnitude?.toFixed(3) || 'N/A'}`);

    bounds.extend([gLat, gLon]);

    L.polyline([[userLat, userLon], [gLat, gLon]], {
      color: '#6366f1',
      weight: 2,
      dashArray: '4 4',
      opacity: 0.7,
    }).addTo(mapInstance);

    if (eclipse.distanceKm != null) {
      const midLat = (userLat + gLat) / 2;
      const midLon = (userLon + gLon) / 2;
      L.tooltip({ permanent: true, direction: 'center', className: 'distance-tooltip' })
        .setLatLng([midLat, midLon])
        .setContent(`${eclipse.distanceKm.toLocaleString()} km`)
        .addTo(mapInstance);
    }
  }

  if (!hasPathDetail && eclipse.category === 'lunar') {
    const info = L.control({ position: 'topright' });
    info.onAdd = function () {
      const div = L.DomUtil.create('div', 'lunar-info-panel');
      div.innerHTML = `
        <strong>${typeLabel} Lunar Eclipse</strong><br>
        ${eclipse.locallyVisible
          ? 'Visible from your location'
          : 'Moon below horizon at your location during this eclipse'}<br>
        Magnitude: ${eclipse.magnitude?.toFixed(3) || 'N/A'}<br>
        Duration: ${Math.round(eclipse.durationMinutes)}m<br>
        <em>Lunar eclipses are visible from anywhere the Moon is above the horizon — roughly half the Earth.</em>
      `;
      return div;
    };
    info.addTo(mapInstance);

    const nightCircle = L.circle([0, eclipse.peakTime.getUTCHours() > 12
        ? (eclipse.peakTime.getUTCHours() - 12) * -15
        : (12 - eclipse.peakTime.getUTCHours()) * 15
      ], {
      radius: 6000000,
      color: '#6366f1',
      fillColor: '#312e81',
      fillOpacity: 0.08,
      weight: 1,
      dashArray: '6 4',
    }).addTo(mapInstance)
      .bindPopup('Approximate night side (eclipse visible)');
    bounds.extend(nightCircle.getBounds());
  }

  mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
  setTimeout(() => mapInstance.invalidateSize(), 100);
}

export function closeMap() {
  document.getElementById('map-modal').classList.add('hidden');
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
}
