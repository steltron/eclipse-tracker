const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ECLIPSES = [
  { date: '2026-02-17', type: 'annular', file: 'SE2026Feb17Apath.html' },
  { date: '2026-08-12', type: 'total', file: 'SE2026Aug12Tpath.html' },
  { date: '2027-02-06', type: 'annular', file: 'SE2027Feb06Apath.html' },
  { date: '2027-08-02', type: 'total', file: 'SE2027Aug02Tpath.html' },
  { date: '2028-01-26', type: 'annular', file: 'SE2028Jan26Apath.html' },
  { date: '2028-07-22', type: 'total', file: 'SE2028Jul22Tpath.html' },
  { date: '2030-06-01', type: 'annular', file: 'SE2030Jun01Apath.html' },
  { date: '2030-11-25', type: 'total', file: 'SE2030Nov25Tpath.html' },
  { date: '2031-05-21', type: 'annular', file: 'SE2031May21Apath.html' },
  { date: '2031-11-14', type: 'total', file: 'SE2031Nov14Hpath.html' },
  { date: '2032-05-09', type: 'annular', file: 'SE2032May09Apath.html' },
  { date: '2033-03-30', type: 'total', file: 'SE2033Mar30Tpath.html' },
  { date: '2034-03-20', type: 'total', file: 'SE2034Mar20Tpath.html' },
  { date: '2034-09-12', type: 'annular', file: 'SE2034Sep12Apath.html' },
  { date: '2035-03-09', type: 'annular', file: 'SE2035Mar09Apath.html' },
  { date: '2035-09-02', type: 'total', file: 'SE2035Sep02Tpath.html' },
  { date: '2037-07-13', type: 'total', file: 'SE2037Jul13Tpath.html' },
  { date: '2038-01-05', type: 'annular', file: 'SE2038Jan05Apath.html' },
  { date: '2038-07-02', type: 'annular', file: 'SE2038Jul02Apath.html' },
  { date: '2038-12-26', type: 'total', file: 'SE2038Dec26Tpath.html' },
  { date: '2039-06-21', type: 'annular', file: 'SE2039Jun21Apath.html' },
  { date: '2039-12-15', type: 'total', file: 'SE2039Dec15Tpath.html' },
  { date: '2041-04-30', type: 'total', file: 'SE2041Apr30Tpath.html' },
  { date: '2041-10-25', type: 'annular', file: 'SE2041Oct25Apath.html' },
  { date: '2042-04-20', type: 'total', file: 'SE2042Apr20Tpath.html' },
  { date: '2042-10-14', type: 'annular', file: 'SE2042Oct14Apath.html' },
  { date: '2043-04-09', type: 'total', file: 'SE2043Apr09Tpath.html' },
  { date: '2044-02-28', type: 'annular', file: 'SE2044Feb28Apath.html' },
  { date: '2044-08-23', type: 'total', file: 'SE2044Aug23Tpath.html' },
  { date: '2045-02-16', type: 'annular', file: 'SE2045Feb16Apath.html' },
  { date: '2045-08-12', type: 'total', file: 'SE2045Aug12Tpath.html' },
  { date: '2046-02-05', type: 'annular', file: 'SE2046Feb05Apath.html' },
  { date: '2046-08-02', type: 'total', file: 'SE2046Aug02Tpath.html' },
  { date: '2047-01-26', type: 'annular', file: 'SE2047Jan26Apath.html' },
  { date: '2048-06-11', type: 'annular', file: 'SE2048Jun11Apath.html' },
  { date: '2048-12-05', type: 'total', file: 'SE2048Dec05Tpath.html' },
  { date: '2049-11-25', type: 'total', file: 'SE2049Nov25Tpath.html' },
  { date: '2050-05-20', type: 'annular', file: 'SE2050May20Apath.html' },
  { date: '2051-03-30', type: 'total', file: 'SE2051Mar30Hpath.html' },
  { date: '2052-03-18', type: 'total', file: 'SE2052Mar18Tpath.html' },
  { date: '2052-09-12', type: 'annular', file: 'SE2052Sep12Apath.html' },
  { date: '2053-09-01', type: 'total', file: 'SE2053Sep01Tpath.html' },
  { date: '2054-02-17', type: 'annular', file: 'SE2054Feb17Apath.html' },
  { date: '2054-08-12', type: 'total', file: 'SE2054Aug12Tpath.html' },
  { date: '2055-07-13', type: 'total', file: 'SE2055Jul13Tpath.html' },
  { date: '2056-01-06', type: 'annular', file: 'SE2056Jan06Apath.html' },
  { date: '2056-07-01', type: 'annular', file: 'SE2056Jul01Apath.html' },
];

// Parse a coordinate pair like "75 56.2N" → 75.9367 or "108 45.5E" → 108.7583
function parseCoordPair(degMin, dir) {
  const deg = parseInt(degMin[0], 10);
  const min = parseFloat(degMin[1].replace(/[NSEW]/i, ''));
  let val = deg + min / 60;
  if (dir === 'S' || dir === 'W') val = -val;
  return val;
}

function parseDataLine(line) {
  // Format: " 17:02   75 56.2N 108 45.5E  85 19.3N 119 25.4E  82 16.5N 112 29.2E  1.033   7   7  273  01m45.8s"
  // We need to extract: Northern Limit (lat, lon), Southern Limit (lat, lon), Central Line (lat, lon)
  const regex = /^\s*(\d{2}:\d{2})\s+(\d+)\s+([\d.]+)([NS])\s+(\d+)\s+([\d.]+)([EW])\s+(\d+)\s+([\d.]+)([NS])\s+(\d+)\s+([\d.]+)([EW])\s+(\d+)\s+([\d.]+)([NS])\s+(\d+)\s+([\d.]+)([EW])/;
  const m = line.match(regex);
  if (!m) return null;

  const nLat = parseCoordPair([m[2], m[3]], m[4]);
  const nLon = parseCoordPair([m[5], m[6]], m[7]);
  const sLat = parseCoordPair([m[8], m[9]], m[10]);
  const sLon = parseCoordPair([m[11], m[12]], m[13]);
  const cLat = parseCoordPair([m[14], m[15]], m[16]);
  const cLon = parseCoordPair([m[17], m[18]], m[19]);

  return { nLat, nLon, sLat, sLon, cLat, cLon };
}

function parseNasaHtml(html) {
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!preMatch) return null;

  const lines = preMatch[1].split('\n');
  const centerLine = [];
  const northLimit = [];
  const southLimit = [];

  for (const line of lines) {
    if (!/^\s*\d{2}:\d{2}/.test(line)) continue;
    const row = parseDataLine(line);
    if (!row) continue;

    northLimit.push([row.nLon, row.nLat]);
    southLimit.push([row.sLon, row.sLat]);
    centerLine.push([row.cLon, row.cLat]);
  }

  if (centerLine.length < 2) return null;

  const polygon = [...northLimit, ...southLimit.reverse()];
  if (polygon.length > 0) polygon.push(polygon[0]);

  return {
    centerLine: { type: 'LineString', coordinates: centerLine },
    pathPolygon: polygon.length > 2 ? { type: 'Polygon', coordinates: [polygon] } : null,
  };
}

function fetchViaCurl(url) {
  try {
    const result = execSync(`curl -s -L --max-time 15 "${url}"`, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    return result;
  } catch {
    return null;
  }
}

function main() {
  console.log(`Scraping NASA eclipse path data for ${ECLIPSES.length} eclipses...`);
  const pathData = {};
  let success = 0;
  let failed = 0;

  for (const eclipse of ECLIPSES) {
    const url = `https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/${eclipse.file}`;
    process.stdout.write(`  ${eclipse.date} (${eclipse.type}): `);

    const html = fetchViaCurl(url);
    if (!html) {
      console.log('FAILED (fetch error)');
      failed++;
      continue;
    }

    const parsed = parseNasaHtml(html);
    if (parsed) {
      pathData[eclipse.date] = { type: eclipse.type, ...parsed };
      console.log(`OK (${parsed.centerLine.coordinates.length} points)`);
      success++;
    } else {
      console.log('FAILED (parse error)');
      failed++;
    }
  }

  const outPath = path.join(__dirname, '..', 'data', 'eclipse-paths.js');
  const content = `// Auto-generated by scrape-nasa-paths.js on ${new Date().toISOString()}\n// ${success} eclipse paths parsed, ${failed} failed.\nexport const eclipsePaths = ${JSON.stringify(pathData, null, 2)};\n`;

  fs.writeFileSync(outPath, content);
  console.log(`\nDone! Wrote ${success} paths to data/eclipse-paths.js (${failed} failed)`);
  console.log(`File size: ${(Buffer.byteLength(content) / 1024).toFixed(1)} KB`);
}

main();
