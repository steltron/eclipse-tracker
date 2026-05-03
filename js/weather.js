export async function fetchWeather(lat, lon, date) {
  const dateStr = date.toISOString().slice(0, 10);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloud_cover,temperature_2m,precipitation_probability&start_date=${dateStr}&end_date=${dateStr}&timezone=auto`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    return data.hourly;
  } catch {
    return null;
  }
}

export function getViewingCondition(cloudCover) {
  if (cloudCover <= 25) return { label: 'Good viewing', cls: 'weather-good' };
  if (cloudCover <= 50) return { label: 'Fair viewing', cls: 'weather-fair' };
  if (cloudCover <= 75) return { label: 'Poor viewing', cls: 'weather-poor' };
  return { label: 'Unlikely visible', cls: 'weather-bad' };
}

export function extractEclipseWeather(hourlyData, eclipseStart, eclipseEnd) {
  if (!hourlyData || !hourlyData.time) return null;
  const startHour = eclipseStart.getHours();
  const endHour = Math.min(eclipseEnd.getHours() + 1, 23);
  const hours = [];
  for (let i = startHour; i <= endHour; i++) {
    if (i < hourlyData.cloud_cover.length) {
      hours.push({
        cloud_cover: hourlyData.cloud_cover[i],
        temperature: hourlyData.temperature_2m[i],
        precip_prob: hourlyData.precipitation_probability[i],
      });
    }
  }
  if (hours.length === 0) return null;
  const avgCloud = hours.reduce((s, h) => s + h.cloud_cover, 0) / hours.length;
  const avgTemp = hours.reduce((s, h) => s + h.temperature, 0) / hours.length;
  const maxPrecip = Math.max(...hours.map(h => h.precip_prob));
  return {
    cloudCover: Math.round(avgCloud),
    temperature: Math.round(avgTemp),
    precipProbability: maxPrecip,
    condition: getViewingCondition(avgCloud),
  };
}

export async function enrichWithWeather(eclipses, lat, lon) {
  const now = new Date();
  const tenDaysFromNow = new Date(now.getTime() + 10 * 86400000);
  const upcoming = eclipses.filter(e => e.date >= now && e.date <= tenDaysFromNow);
  for (const eclipse of upcoming) {
    const hourly = await fetchWeather(lat, lon, eclipse.date);
    eclipse.weather = extractEclipseWeather(hourly, eclipse.startTime, eclipse.endTime);
  }
}
