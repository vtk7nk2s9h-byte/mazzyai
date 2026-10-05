// Builds components/ui/scroll-globe-coastlines.json, the coastline overlay for
// components/ui/scroll-globe.jsx, from a Natural Earth coastline GeoJSON.
//
//   curl -L -o ne_50m_coastline.geojson \
//     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_coastline.geojson
//   node scripts/build-coastlines.mjs ne_50m_coastline.geojson [tolerance-in-degrees]
//
// Natural Earth is public domain. The script thins each line (Douglas-Peucker)
// so the file stays small, rounds to 2 decimals (about 1 km), and writes every
// line as a flat [lon, lat, lon, lat, ...] array. A lower tolerance keeps more
// detail and a bigger file. For the 50m set: 0.06 is 246 KB (91 KB gzipped),
// 0.1 is 182 KB (68 KB), 0.15 is 141 KB (53 KB). The default is 0.06; the file
// in the repo was built with 0.1.

import fs from 'node:fs';

const [input, tolArg] = process.argv.slice(2);
if (!input) {
  console.error('Usage: node scripts/build-coastlines.mjs <ne_*_coastline.geojson> [tolerance]');
  process.exit(1);
}
const tolerance = Number(tolArg ?? 0.06);

/** Douglas-Peucker on [lon, lat] points, iterative so long coasts can't overflow the stack. */
function simplify(points, tol) {
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = 0;
    let at = -1;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-12;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (worst > tol && at > 0) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const geo = JSON.parse(fs.readFileSync(input, 'utf8'));
const lines = [];
let before = 0;
for (const f of geo.features) {
  const parts = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const part of parts) {
    before += part.length;
    const thin = simplify(part, tolerance);
    if (thin.length < 2) continue;
    lines.push(thin.flatMap(([lon, lat]) => [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100]));
  }
}

const out = 'components/ui/scroll-globe-coastlines.json';
fs.writeFileSync(out, JSON.stringify(lines));
const after = lines.reduce((n, l) => n + l.length / 2, 0);
console.log(
  `${out}: ${lines.length} lines, ${after} points (from ${before}), ${(fs.statSync(out).size / 1024).toFixed(1)} KB`,
);
