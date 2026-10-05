// Builds components/ui/scroll-globe-land.json, the land/sea bitmap the globe's
// dots are drawn from, out of Natural Earth land polygons.
//
//   curl -L -o ne_50m_land.geojson \
//     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson
//   node scripts/build-land-mask.mjs ne_50m_land.geojson [cells-per-degree]
//
// Natural Earth is public domain. The bitmap has `4` cells per degree by
// default (1440 x 720): a cell is land if its centre is inside a land polygon.
// It replaces a hand-made 1° bitmap that was right overall but several degrees
// out in places (Iceland sat about 4° west of where it is), which only showed
// once real coastlines were drawn over it.
//
// Rasterised by scanline: for each row, find where every polygon edge crosses
// the row's centre line and fill between pairs of crossings (even-odd, so
// lakes cut out of a polygon stay water). That is far cheaper than testing
// every cell against every polygon.

import fs from 'node:fs';

const [input, perDegArg] = process.argv.slice(2);
if (!input) {
  console.error('Usage: node scripts/build-land-mask.mjs <ne_*_land.geojson> [cells-per-degree]');
  process.exit(1);
}
const perDeg = Number(perDegArg ?? 4);
const W = 360 * perDeg;
const H = 180 * perDeg;

const geo = JSON.parse(fs.readFileSync(input, 'utf8'));
const rings = [];
for (const f of geo.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) rings.push(...poly);
}

// Bucket the edges by the rows they cross, so each row only looks at its own.
const rowEdges = Array.from({ length: H }, () => []);
for (const ring of rings) {
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    if (y0 === y1) continue;
    const top = Math.min(y0, y1);
    const bottom = Math.max(y0, y1);
    // Row r has its centre at lat 90 - (r + 0.5) / perDeg.
    const rFrom = Math.max(0, Math.ceil((90 - bottom) * perDeg - 0.5));
    const rTo = Math.min(H - 1, Math.floor((90 - top) * perDeg - 0.5));
    for (let r = rFrom; r <= rTo; r++) rowEdges[r].push(x0, y0, x1, y1);
  }
}

const bits = new Uint8Array(Math.ceil((W * H) / 8));
let land = 0;
for (let r = 0; r < H; r++) {
  const lat = 90 - (r + 0.5) / perDeg;
  const xs = [];
  const e = rowEdges[r];
  for (let k = 0; k < e.length; k += 4) {
    const [x0, y0, x1, y1] = [e[k], e[k + 1], e[k + 2], e[k + 3]];
    if ((y0 > lat) !== (y1 > lat)) xs.push(x0 + ((lat - y0) / (y1 - y0)) * (x1 - x0));
  }
  xs.sort((a, b) => a - b);
  for (let k = 0; k + 1 < xs.length; k += 2) {
    // Cell c has its centre at lon -180 + (c + 0.5) / perDeg.
    const cFrom = Math.max(0, Math.ceil((xs[k] + 180) * perDeg - 0.5));
    const cTo = Math.min(W - 1, Math.floor((xs[k + 1] + 180) * perDeg - 0.5));
    for (let c = cFrom; c <= cTo; c++) {
      const i = r * W + c;
      bits[i >> 3] |= 0x80 >> (i & 7);
      land++;
    }
  }
}

const out = 'components/ui/scroll-globe-land.json';
fs.writeFileSync(out, JSON.stringify({ w: W, h: H, data: Buffer.from(bits).toString('base64') }));
const kb = (fs.statSync(out).size / 1024).toFixed(1);
console.log(`${out}: ${W}x${H}, ${((100 * land) / (W * H)).toFixed(1)}% land, ${kb} KB`);
