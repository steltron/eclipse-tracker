import { getEmails } from './settings.js';

function formatGCalDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildCalendarUrl(eclipse, locationName) {
  const typeLabel = eclipse.type.charAt(0).toUpperCase() + eclipse.type.slice(1);
  const categoryLabel = eclipse.category === 'solar' ? 'Solar' : 'Lunar';
  let title = `${typeLabel} ${categoryLabel} Eclipse`;
  if (eclipse.distanceKm !== null && eclipse.distanceKm !== undefined) {
    if (eclipse.distanceKm < 50) {
      title += ' — Visible from home!';
    } else {
      title += ` — ${Math.round(eclipse.distanceKm)} km away`;
    }
  }

  const start = new Date(eclipse.startTime.getTime() - 30 * 60000);
  const end = new Date(eclipse.endTime.getTime() + 15 * 60000);

  const details = [
    `Type: ${typeLabel} ${categoryLabel} Eclipse`,
    `Peak: ${eclipse.peakTime.toLocaleString()}`,
    `Duration: ${eclipse.durationMinutes} minutes`,
    eclipse.obscuration != null ? `Obscuration: ${(eclipse.obscuration * 100).toFixed(1)}%` : '',
    eclipse.magnitude != null ? `Magnitude: ${eclipse.magnitude.toFixed(3)}` : '',
    eclipse.distanceKm != null ? `Distance to path: ${Math.round(eclipse.distanceKm)} km` : '',
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGCalDate(start)}/${formatGCalDate(end)}`,
    details: details,
    location: locationName || '',
  });

  const emails = getEmails();
  emails.forEach(email => params.append('add', email));

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
