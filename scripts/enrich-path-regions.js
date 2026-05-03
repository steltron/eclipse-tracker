const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dataPath = path.join(__dirname, '..', 'data', 'eclipse-paths.js');
const raw = fs.readFileSync(dataPath, 'utf8');
const jsonStr = raw.replace(/^[^{]*/, '').replace(/;\s*$/, '');
const pathData = JSON.parse(jsonStr);

function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=5&accept-language=en`;
    const result = execSync(
      `curl -s -H "User-Agent: EclipseTracker/1.0" --max-time 10 "${url}"`,
      { encoding: 'utf8' }
    );
    const data = JSON.parse(result);
    if (data.error) return null;
    const addr = data.address;
    const city = addr.city || addr.town || addr.state || '';
    const country = addr.country || '';
    return { city, country };
  } catch {
    return null;
  }
}

function sampleIndices(len, count) {
  if (len <= count) return Array.from({ length: len }, (_, i) => i);
  const indices = [];
  for (let i = 0; i < count; i++) {
    indices.push(Math.round(i * (len - 1) / (count - 1)));
  }
  return indices;
}

function sleep(ms) {
  execSync(`sleep ${ms / 1000}`);
}

async function main() {
  const dates = Object.keys(pathData);
  console.log(`Enriching ${dates.length} eclipse paths with region data...\n`);

  for (const date of dates) {
    const entry = pathData[date];
    const coords = entry.centerLine?.coordinates;
    if (!coords || coords.length < 2) {
      console.log(`  ${date}: no center line, skipping`);
      continue;
    }

    const sampleCount = Math.min(8, coords.length);
    const indices = sampleIndices(coords.length, sampleCount);

    process.stdout.write(`  ${date} (${entry.type}): `);
    const countries = [];
    const regions = [];

    for (const idx of indices) {
      const [lon, lat] = coords[idx];
      sleep(1100);
      const geo = reverseGeocode(lat, lon);
      if (geo) {
        if (geo.country && !countries.includes(geo.country)) {
          countries.push(geo.country);
          const label = geo.city ? `${geo.city}, ${geo.country}` : geo.country;
          regions.push(label);
        }
      } else {
        const oceanName = getOceanName(lat, lon);
        if (!countries.includes(oceanName)) {
          countries.push(oceanName);
          regions.push(oceanName);
        }
      }
      process.stdout.write('.');
    }

    entry.regions = regions;
    console.log(` → ${regions.join(' → ')}`);
  }

  const header = raw.match(/^(\/\/[^\n]*\n)*/)?.[0] || '';
  const output = `${header}export const eclipsePaths = ${JSON.stringify(pathData, null, 2)};\n`;
  fs.writeFileSync(dataPath, output);
  console.log(`\nDone! Updated ${dataPath}`);
  console.log(`File size: ${(Buffer.byteLength(output) / 1024).toFixed(1)} KB`);
}

function getOceanName(lat, lon) {
  if (lat > 65) return 'Arctic';
  if (lat < -60) return 'Antarctic';
  if (lon >= -80 && lon <= 0 && lat >= -10 && lat <= 60) return 'Atlantic Ocean';
  if (lon >= 0 && lon <= 40 && lat >= -40 && lat <= 40) return 'Atlantic Ocean';
  if ((lon >= 100 || lon <= -100) && lat >= -50 && lat <= 50) return 'Pacific Ocean';
  if (lon >= 40 && lon <= 100 && lat >= -40 && lat <= 30) return 'Indian Ocean';
  return 'Ocean';
}

main();
