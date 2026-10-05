"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import COASTLINES from "./scroll-globe-coastlines.json";
import LAND from "./scroll-globe-land.json";
import SectionHeading from "@/components/ui/section-heading";
import UseCaseExplorer from "@/components/ui/use-case-explorer";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

// The land/sea bitmap the dots are drawn from lives in scroll-globe-land.json,
// built from Natural Earth polygons by scripts/build-land-mask.mjs.

export const DEFAULT_AIRPORTS = {
  JFK: { name: "New York", lat: 40.64, lon: -73.78 },
  LHR: { name: "London", lat: 51.47, lon: -0.45 },
  ORD: { name: "Chicago", lat: 41.98, lon: -87.9 },
  FRA: { name: "Frankfurt", lat: 50.04, lon: 8.56 },
  LAX: { name: "Los Angeles", lat: 33.94, lon: -118.41 },
  IST: { name: "Istanbul", lat: 41.26, lon: 28.74 },
  DXB: { name: "Dubai", lat: 25.25, lon: 55.36 },
  BOM: { name: "Mumbai", lat: 19.09, lon: 72.87 },
  JNB: { name: "Johannesburg", lat: -26.14, lon: 28.24 },
  SIN: { name: "Singapore", lat: 1.36, lon: 103.99 },
  HKG: { name: "Hong Kong", lat: 22.31, lon: 113.91 },
  HND: { name: "Tokyo", lat: 35.55, lon: 139.78 },
  SYD: { name: "Sydney", lat: -33.94, lon: 151.18 },
  GRU: { name: "São Paulo", lat: -23.43, lon: -46.47 },
  EZE: { name: "Buenos Aires", lat: -34.82, lon: -58.54 },
  SCL: { name: "Santiago", lat: -33.39, lon: -70.79 },
  MAD: { name: "Madrid", lat: 40.47, lon: -3.56 },
  PER: { name: "Perth", lat: -31.94, lon: 115.97 },
  CDG: { name: "Paris", lat: 49.01, lon: 2.55 },
  YYZ: { name: "Toronto", lat: 43.68, lon: -79.63 },
  CAI: { name: "Cairo", lat: 30.12, lon: 31.41 },
  ICN: { name: "Seoul", lat: 37.46, lon: 126.44 },
  AKL: { name: "Auckland", lat: -37.01, lon: 174.79 },
};

// Each chapter = one scroll "stop". focus is where the globe turns to,
// distance is camera distance (bigger = further out), routes are [from, to].
// `points` are the bullet lines: each gets a red strip that fills as the slide
// scrolls, on the same timing curve the arcs use, so copy and globe advance
// together. Point count is independent of route count — slide 5 has no arcs.
export const DEFAULT_CHAPTERS = [
  // The old first chapter, kept for later. The intro
  // (components/ui/intro-hero.tsx) opens the page now, and "Why Hire" follows
  // it directly. To bring this back, uncomment the whole object; it was the
  // stop that turned the globe to the Atlantic routes.
  //
  // {
  //   title: "What is an AI Voice Agent",
  //   body: "",
  //   focus: { lat: 45, lon: -40 },
  //   distance: 3.9,
  //   routes: [["JFK", "LHR"], ["ORD", "FRA"], ["LAX", "LHR"], ["IST", "JFK"], ["MAD", "JFK"], ["CDG", "JFK"], ["YYZ", "LHR"], ["FRA", "JFK"], ["ORD", "CDG"], ["YYZ", "FRA"], ["LAX", "CDG"], ["IST", "ORD"], ["MAD", "YYZ"], ["LHR", "ORD"]],
  //   points: [
  //     "A trained AI voice agent that answers your line 24/7. No shifts, no breaks, no hold queue.",
  //     "Built on your own hours, location, services and policies. thus, never a generic script.",
  //     "Speaks naturally and answers the moment a call arrives.",
  //     "Runs on your existing number. No hiring, no training, no turnover.",
  //   ],
  // },
  {
    title: "Why Hire an AI Voice Agent",
    body: "",
    focus: { lat: 22, lon: 48 },
    distance: 3.8,
    routes: [["LHR", "DXB"], ["DXB", "BOM"], ["DXB", "JNB"], ["DXB", "SIN"], ["DXB", "HKG"], ["CAI", "DXB"], ["FRA", "DXB"], ["IST", "DXB"], ["DXB", "ICN"], ["BOM", "SIN"], ["CAI", "JNB"], ["DXB", "HND"]],
    points: [
      "Every unanswered call is a customer who called your competitor next.",
      "Staff stop losing hours to the same five questions.",
      "Covers nights, weekends and holidays - when most calls go unanswered.",
      // Kept for later: each chapter is down to three points.
      // "It scales along side your business, as a result, busier season, more locations, more calls, same reliability.",
    ],
  },
  {
    title: "What Problems It Solves",
    body: "",
    focus: { lat: 18, lon: 135 },
    distance: 4.1,
    routes: [["SIN", "HKG"], ["HKG", "HND"], ["SIN", "SYD"], ["HND", "LAX"], ["HND", "SYD"], ["ICN", "SIN"], ["ICN", "HND"], ["HKG", "SYD"], ["SIN", "PER"], ["ICN", "LAX"], ["HKG", "ICN"], ["HND", "SIN"]],
    points: [
      "Missed calls that become missed bookings, orders and patients.",
      "Staff interrupted by repetitive questions instead of serving the customer present.",
      "No coverage after hours, and slow response when every line is busy.",
      // Kept for later: each chapter is down to three points.
      // "Inconsistent answers, and the cost of staffing a desk just to cover the phone.",
    ],
  },
  {
    title: "Personalised and Tailored for Your Facility's Needs",
    body: "",
    focus: { lat: -24, lon: 12 },
    distance: 4.4,
    routes: [["GRU", "JNB"], ["JNB", "PER"], ["EZE", "MAD"], ["SCL", "GRU"], ["SCL", "SYD"], ["AKL", "SYD"], ["EZE", "GRU"], ["GRU", "MAD"], ["JNB", "SYD"], ["PER", "SYD"], ["SCL", "AKL"], ["EZE", "SCL"]],
    points: [
      "Trained on your own details: name, location, hours and services.",
      "Adapts to your sector — reservations, appointments or intake requests.",
      "Speaks in your brand's tone and stays strictly within the facts you provide.",
      // Kept for later: each chapter is down to three points.
      // "Update its knowledge the moment your details change.",
    ],
  },
  {
    heading: (
      <SectionHeading
        title="Use cases"
        eyebrow="Who it is for"
        className="-ml-8 mb-8 items-start text-left"
      />
    ),
    title: "Explore different use cases tailored to your business.",
    body: "",
    focus: { lat: 22, lon: 20 },
    distance: 5.1,
    routes: [],
    overview: true,
    points: [],
    // Rendered under the title in place of the bullet list.
    content: <UseCaseExplorer />,
    // The intro's "Find your use case" link lands here.
    id: "explore",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
// The docked globe: always on screen along the bottom edge. Tune the look here.
const DOCK_HEIGHT = 0.55; // how far the globe rises above the bottom edge, as a fraction of the viewport height
const DOCK_SCALE = 1; // 1 = the globe's chord spans the full width; lower = a smaller globe
const DOCK_LIFT = 0.5; // radians; how high in the visible part a chapter's region is shown
const DOCK_OPACITY = 0.6; // lower keeps the text over it readable
const DOCK_SPIN = 0.020; // radians per second of idle turning: the one spin rate, in the chapters and after them
// The swing of the globe from one chapter's region to the next. It has its own
// smoothing, apart from the text and arcs (which follow the scroll closely).
const SWING_FOLLOW = 1.5; // how closely the swing follows the scroll: lower = slower, more gliding. About 1 / this many seconds behind
const SWING_FROM = 0.4; // how far into a chapter (0 to 1) the swing to the next region begins: lower = starts earlier, so a longer, slower turn
const DOCK_DETAIL_PX = 330; // on-screen globe radius that the arcs, dots and markers were designed for
const LAND_DOTS = 150000; // points scattered over the whole sphere, before the land mask keeps ~30% of them: more = denser continents
const LAND_DOT_SIZE = 0.012; // dot size as a fraction of the globe radius (before the docked shrink)
const COAST_OPACITY = 0.8; // coastline overlay brightness; 0 hides it
const COAST_LIFT = 1.004; // how far above the dots it sits, as a multiple of the globe radius
const DOCK_FOV = 22; // degrees; narrow, so the near surface isn't magnified

/**
 * The docked globe as a circle on screen: radius `r`, rising `capH` above the
 * bottom edge, so its centre is below the viewport. Sized so its chord across
 * the bottom edge is nearly the full width (then scaled down by DOCK_SCALE).
 */
function dockGeometry(W, H) {
  const rise = H * DOCK_HEIGHT;
  let r = (DOCK_SCALE * (W * W) / 4 + DOCK_SCALE * rise * rise) / (2 * rise);
  // On a phone that formula gives a small sphere that barely clears the edge,
  // so narrow screens get a bigger one, a little wider than the screen.
  if (W < 760) r = Math.max(r, W * 0.62);
  return { r, capH: Math.min(rise, r * 0.95) };
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const wrapPi = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);

function latLonToVec3(lat, lon, r) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function greatCircleKm(a, b) {
  const dLat = (b.lat - a.lat) * DEG;
  const dLon = (b.lon - a.lon) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** (lat, lon) -> 1 if that spot is land. Row 0 is 90°N and column 0 is 180°W. */
function makeLandTest({ w, h, data }) {
  const bin = atob(data);
  const perDeg = w / 360;
  return (lat, lon) => {
    const row = clamp(Math.floor((90 - lat) * perDeg), 0, h - 1);
    const col = ((Math.floor((lon + 180) * perDeg) % w) + w) % w;
    const i = row * w + col;
    return (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
  };
}

function radialTexture(size, stops) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/**
 * A speech-like waveform as an SVG path. Deterministic from `seed` — a
 * Math.random() version would render differently on the server and the client
 * and trip a hydration mismatch.
 *
 * Three stacked sines at incommensurate frequencies give the irregular,
 * non-repeating shape of a voice; the `env` term tapers both ends to zero so
 * the line settles onto the baseline instead of being cut off mid-peak.
 */
/**
 * Bar heights for a voice-memo style waveform, as percentages of the row.
 * Deterministic from `seed` — Math.random() would render differently on the
 * server and the client and trip a hydration mismatch.
 *
 * Three stacked sines at incommensurate frequencies (23/41/71) give the
 * irregular, non-repeating rhythm of speech; the absolute value makes it an
 * amplitude rather than a signal, and `env` tapers both ends so the clip starts
 * and finishes quiet the way a recording does.
 */
function waveBars(seed, count = 88) {
  const bars = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const env = Math.pow(Math.sin(Math.PI * t), 0.35);
    const n = Math.abs(
      Math.sin(t * 23 + seed * 1.7) * 0.55 +
        Math.sin(t * 41 + seed * 3.1) * 0.3 +
        Math.sin(t * 71 + seed * 5.3) * 0.15
    );
    // Floor of 14% so quiet passages still read as bars, not gaps.
    bars.push(Math.round(Math.max(0.14, n * env) * 100));
  }
  return bars;
}

/**
 * The same bars drawn twice: a dim resting track, and a lit copy the scroll
 * loop reveals by clipping. Flex with `flex:1` rather than fixed widths, so the
 * bars stay evenly spaced at any column width.
 */
function Waveform({ seed }) {
  const bars = waveBars(seed);
  const layer = (cls) => (
    <span className={cls}>
      {bars.map((pct, k) => (
        <i key={k} style={{ height: `${pct}%` }} />
      ))}
    </span>
  );
  return (
    <span className="sg-wave" aria-hidden="true">
      {layer("sg-wave-track")}
      {layer("sg-fill")}
    </span>
  );
}

// Splits on a standalone "AI" so it can be tinted. The capture group keeps the
// delimiter in the result, and the word boundaries stop it matching inside
// words like "AID" or "SAID".
const AI_TOKEN = /(\bAI\b)/g;

function markAI(text) {
  if (typeof text !== "string") return text;
  return text
    .split(AI_TOKEN)
    .map((part, i) =>
      part === "AI" ? (
        <em key={i} className="sg-ai">
          AI
        </em>
      ) : (
        part
      )
    );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ScrollGlobe({
  chapters = DEFAULT_CHAPTERS,
  airports = DEFAULT_AIRPORTS,
  color = "#ff2e43",
  background = "#090203",
  heightPerChapter = 55, // vh each chapter takes up in the page: lower = sections closer together
  loadFonts = true,
  className = "",
  // `= undefined` only so TS, which infers this component's props from the JS
  // source, treats style as optional. Destructuring undefined is identical at
  // runtime to leaving it bare.
  style = undefined,
}) {
  const rootRef = useRef(null);
  const canvasHostRef = useRef(null);
  const pointEls = useRef({});
  const railEls = useRef([]);
  const footEl = useRef(null);
  const labelEls = useRef({});

  const routes = useMemo(() => {
    const list = [];
    chapters.forEach((c, ci) => {
      const valid = (c.routes || []).filter(([a, b]) => {
        const ok = airports[a] && airports[b];
        if (!ok) console.warn(`ScrollGlobe: unknown airport in route ${a}-${b}`);
        return ok;
      });
      valid.forEach(([from, to], j) => {
        list.push({
          id: `${ci}-${j}`,
          from,
          to,
          chapter: ci,
          index: j,
          count: valid.length,
          km: Math.round(greatCircleKm(airports[from], airports[to])),
        });
      });
    });
    return list;
  }, [chapters, airports]);

  const usedAirports = useMemo(
    () => [...new Set(routes.flatMap((r) => [r.from, r.to]))],
    [routes]
  );
  const tint = useMemo(() => {
    const c = new THREE.Color(color);
    return `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
  }, [color]);

  // Optional: B612 was designed for aircraft cockpit displays.
  useEffect(() => {
    if (!loadFonts || document.getElementById("sg-b612-font")) return;
    const link = document.createElement("link");
    link.id = "sg-b612-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=B612:wght@400;700&family=B612+Mono&display=swap";
    document.head.appendChild(link);
  }, [loadFonts]);

  useEffect(() => {
    const host = canvasHostRef.current;
    const root = rootRef.current;
    if (!host || !root) return;

    const N = chapters.length;
    const R = 1;
    const reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- renderer / scene / camera ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(DOCK_FOV, 1, 0.1, 100);
    const tanHalf = Math.tan((DOCK_FOV / 2) * DEG);
    // The arcs, dots and markers are sized in world units for a globe about
    // DOCK_DETAIL_PX across; docked, it is bigger, so they shrink to match.
    const detail = clamp(
      DOCK_DETAIL_PX / dockGeometry(window.innerWidth, window.innerHeight).r,
      0.2,
      1.2
    );
    const globe = new THREE.Group();
    scene.add(globe);

    const red = new THREE.Color(color);
    const hot = red.clone().lerp(new THREE.Color("#ffffff"), 0.45);
    const disposables = [];
    const track = (o) => (disposables.push(o), o);

    /* ---------- base sphere with a soft red limb ---------- */
    const baseMat = track(
      new THREE.ShaderMaterial({
        uniforms: {
          uBase: { value: new THREE.Color(background).lerp(new THREE.Color("#000"), 0.2) },
          uRim: { value: red.clone().multiplyScalar(0.55) },
        },
        vertexShader: `
          varying vec3 vN;
          void main(){
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }`,
        fragmentShader: `
          uniform vec3 uBase; uniform vec3 uRim; varying vec3 vN;
          void main(){
            float rim = 1.0 - max(dot(vN, vec3(0.0,0.0,1.0)), 0.0);
            gl_FragColor = vec4(mix(uBase, uRim, pow(rim, 3.0) * 0.7), 1.0);
          }`,
      })
    );
    globe.add(new THREE.Mesh(track(new THREE.SphereGeometry(R * 0.995, 72, 72)), baseMat));

    /* ---------- land as a field of dots ---------- */
    const isLand = makeLandTest(LAND);
    const DOTS = LAND_DOTS;
    const SPACING_DEG = Math.sqrt((4 * Math.PI) / DOTS) / DEG; // gap between neighbouring dots
    const golden = Math.PI * (3 - Math.sqrt(5));
    const pos = [];
    const rnd = [];
    for (let i = 0; i < DOTS; i++) {
      const y = 1 - (i / (DOTS - 1)) * 2;
      // Nudged by up to 0.4 of the dot spacing: a regular lattice seen edge-on
      // lines up into stripes near the globe's rim, and the nudge breaks that
      // up. It also softens the land mask's 1° stair-steps along the coasts.
      const lat = Math.asin(y) / DEG + (Math.random() - 0.5) * SPACING_DEG * 0.8;
      const lon =
        (((golden * i) / DEG) % 360) -
        180 +
        ((Math.random() - 0.5) * SPACING_DEG * 0.8) / Math.max(0.1, Math.cos(lat * DEG));
      if (!isLand(lat, lon)) continue;
      const v = latLonToVec3(lat, lon, R * 1.002);
      pos.push(v.x, v.y, v.z);
      rnd.push(Math.random());
    }
    const dotGeo = track(new THREE.BufferGeometry());
    dotGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    dotGeo.setAttribute("aRand", new THREE.Float32BufferAttribute(rnd, 1));
    const dotMat = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: red },
          uTime: { value: 0 },
          uH: { value: 800 },
          uTan: { value: tanHalf },
          uPt: { value: LAND_DOT_SIZE * detail },
          uTwinkle: { value: reduceMotion ? 0 : 1 },
        },
        vertexShader: `
          uniform float uH; uniform float uTan; uniform float uPt;
          attribute float aRand; varying float vRand; varying float vFacing;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uPt * uH / (2.0 * uTan * -mv.z);
            gl_Position = projectionMatrix * mv;
            vRand = aRand;
            vFacing = normalize(normalMatrix * normalize(position)).z;
          }`,
        fragmentShader: `
          uniform vec3 uColor; uniform float uTime; uniform float uTwinkle;
          varying float vRand; varying float vFacing;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.15, d);
            float edge = smoothstep(-0.05, 0.55, vFacing);
            float tw = 1.0 - uTwinkle * 0.3 * (0.5 + 0.5 * sin(uTime * 1.4 + vRand * 60.0));
            gl_FragColor = vec4(uColor * (0.5 + 0.5 * edge) * tw, a * (0.3 + 0.7 * edge));
          }`,
      })
    );
    globe.add(new THREE.Points(dotGeo, dotMat));

    /* ---------- graticule ---------- */
    const grat = [];
    const gr = R * 1.001;
    for (let lat = -75; lat <= 75; lat += 15) {
      for (let k = 0; k < 144; k++) {
        const a = latLonToVec3(lat, (k / 144) * 360 - 180, gr);
        const b = latLonToVec3(lat, ((k + 1) / 144) * 360 - 180, gr);
        grat.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    for (let lon = -180; lon < 180; lon += 15) {
      for (let k = 0; k < 72; k++) {
        const a = latLonToVec3(-90 + (k / 72) * 180, lon, gr);
        const b = latLonToVec3(-90 + ((k + 1) / 72) * 180, lon, gr);
        grat.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const gratGeo = track(new THREE.BufferGeometry());
    gratGeo.setAttribute("position", new THREE.Float32BufferAttribute(grat, 3));
    const gratMat = track(
      new THREE.LineBasicMaterial({ color: red, transparent: true, opacity: 0.09, depthWrite: false })
    );
    globe.add(new THREE.LineSegments(gratGeo, gratMat));

    /* ---------- coastlines (Natural Earth, thinned; see scripts/build-coastlines.mjs) ---------- */
    // Drawn over the dots, so the land is a field of dots with a clean edge.
    // Long straight stretches are split, because a chord between two far-apart
    // points would cut under the sphere's surface and vanish behind it.
    const coast = [];
    const cr = R * COAST_LIFT;
    const MAX_STEP = 2 * DEG;
    COASTLINES.forEach((line) => {
      for (let i = 0; i + 3 < line.length; i += 2) {
        const a = latLonToVec3(line[i + 1], line[i], 1);
        const b = latLonToVec3(line[i + 3], line[i + 2], 1);
        const steps = Math.max(1, Math.ceil(a.angleTo(b) / MAX_STEP));
        let from = a;
        for (let s = 1; s <= steps; s++) {
          const to = s === steps ? b : a.clone().lerp(b, s / steps).normalize();
          coast.push(from.x * cr, from.y * cr, from.z * cr, to.x * cr, to.y * cr, to.z * cr);
          from = to;
        }
      }
    });
    const coastGeo = track(new THREE.BufferGeometry());
    coastGeo.setAttribute("position", new THREE.Float32BufferAttribute(coast, 3));
    const coastMat = track(
      new THREE.LineBasicMaterial({
        color: red,
        transparent: true,
        opacity: COAST_OPACITY,
        depthWrite: false,
      })
    );
    globe.add(new THREE.LineSegments(coastGeo, coastMat));

    /* ---------- atmosphere halo (camera-facing sprite) ---------- */
    const haloTex = track(
      radialTexture(512, [
        [0, `rgba(${tint},0)`],
        [0.7, `rgba(${tint},0)`],
        [0.755, `rgba(${tint},0.55)`],
        [0.8, `rgba(${tint},0.2)`],
        [0.9, `rgba(${tint},0.05)`],
        [1, `rgba(${tint},0)`],
      ])
    );
    const haloMat = track(
      new THREE.SpriteMaterial({
        map: haloTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const halo = new THREE.Sprite(haloMat);
    const haloScale = (2 * R) / 0.755;
    halo.scale.set(haloScale, haloScale, 1);
    scene.add(halo);

    const dotTex = track(
      radialTexture(64, [
        [0, "rgba(255,255,255,1)"],
        [0.25, "rgba(255,255,255,0.8)"],
        [1, "rgba(255,255,255,0)"],
      ])
    );

    /* ---------- airport markers ---------- */
    const ringGeo = track(new THREE.RingGeometry(0.013 * detail, 0.019 * detail, 40));
    const coreGeo = track(new THREE.CircleGeometry(0.0075 * detail, 24));
    const pulseGeo = track(new THREE.RingGeometry(0.017 * detail, 0.02 * detail, 40));
    const zAxis = new THREE.Vector3(0, 0, 1);
    const markers = {};
    usedAirports.forEach((code, i) => {
      const ap = airports[code];
      const p = latLonToVec3(ap.lat, ap.lon, R * 1.004);
      const m = new THREE.Group();
      m.position.copy(p);
      m.quaternion.setFromUnitVectors(zAxis, p.clone().normalize());
      const mk = (geo, opacity) => {
        const mat = track(
          new THREE.MeshBasicMaterial({
            color: hot,
            transparent: true,
            opacity,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        );
        const mesh = new THREE.Mesh(geo, mat);
        m.add(mesh);
        return mesh;
      };
      const ring = mk(ringGeo, 0);
      const core = mk(coreGeo, 0);
      const pulse = mk(pulseGeo, 0);
      globe.add(m);
      markers[code] = { group: m, ring, core, pulse, a: 0, target: 0, phase: i * 0.37 };
    });

    /* ---------- arcs ---------- */
    const SEG = 96;
    const RAD = 6;
    const arcs = routes.map((r) => {
      const A = airports[r.from];
      const B = airports[r.to];
      const a = latLonToVec3(A.lat, A.lon, R * 1.002);
      const b = latLonToVec3(B.lat, B.lon, R * 1.002);
      const ang = a.angleTo(b);
      const alt = 0.05 + (ang / Math.PI) * 0.25;
      const c1 = a.clone().lerp(b, 0.25).normalize().multiplyScalar(R * (1 + alt));
      const c2 = a.clone().lerp(b, 0.75).normalize().multiplyScalar(R * (1 + alt));
      const curve = new THREE.CubicBezierCurve3(a, c1, c2, b);
      const coreGeoA = track(new THREE.TubeGeometry(curve, SEG, 0.0042 * detail, RAD, false));
      const glowGeoA = track(new THREE.TubeGeometry(curve, SEG, 0.012 * detail, RAD, false));
      const coreMat = track(
        new THREE.MeshBasicMaterial({
          color: hot,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      const glowMat = track(
        new THREE.MeshBasicMaterial({
          color: red,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      const coreMesh = new THREE.Mesh(coreGeoA, coreMat);
      const glowMesh = new THREE.Mesh(glowGeoA, glowMat);
      coreGeoA.setDrawRange(0, 0);
      glowGeoA.setDrawRange(0, 0);
      globe.add(glowMesh, coreMesh);

      const spriteMat = (c) =>
        track(
          new THREE.SpriteMaterial({
            map: dotTex,
            color: c,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            opacity: 0,
          })
        );
      const head = new THREE.Sprite(spriteMat(hot));
      head.scale.set(0.1 * detail, 0.1 * detail, 1);
      const traffic = new THREE.Sprite(spriteMat(hot));
      traffic.scale.set(0.055 * detail, 0.055 * detail, 1);
      globe.add(head, traffic);

      const start = r.chapter + 0.08 + r.index * (0.42 / Math.max(1, r.count));
      return {
        ...r,
        curve,
        coreGeo: coreGeoA,
        glowGeo: glowGeoA,
        coreMat,
        glowMat,
        head,
        traffic,
        start,
        end: start + 0.3,
        speed: 0.22 / curve.getLength(),
        offset: Math.random(),
        focus: 0,
        e: 0,
      };
    });

    /* ---------- chapter camera targets ---------- */
    const rotY = [];
    const rotX = [];
    chapters.forEach((c, i) => {
      const v = latLonToVec3(c.focus.lat, c.focus.lon, 1);
      const raw = -Math.atan2(v.x, v.z);
      rotY.push(i === 0 ? raw : rotY[i - 1] + wrapPi(raw - rotY[i - 1]));
      // Apparent latitude = lat - rotation.x, so this puts the region DOCK_LIFT
      // above the globe's middle, inside the part that is on screen.
      rotX.push(c.focus.lat * DEG - DOCK_LIFT);
    });

    /* ---------- bullet reveal timings ---------- */
    // Mirrors the arc formula above: staggered across the first 0.42 of the
    // chapter, each taking 0.3 to complete.
    const pointTimings = [];
    chapters.forEach((c, ci) => {
      const pts = c.points || [];
      pts.forEach((_, j) => {
        const start = ci + 0.08 + j * (0.42 / Math.max(1, pts.length));
        pointTimings.push({ id: `${ci}-${j}`, start, end: start + 0.3 });
      });
    });

    /* ---------- sizing ---------- */
    // The host is a fixed, viewport-sized layer (see .sg-canvas), so W and H are
    // the viewport. The globe is always docked: a circle of radius rPx whose
    // centre sits below the bottom edge, so only its top rises into view. The
    // camera distance that projects the sphere that large, and the view offset
    // that drops its centre off-screen, are worked out here on every resize.
    let W = 1;
    let H = 1;
    const resize = () => {
      W = Math.max(1, host.clientWidth);
      H = Math.max(1, host.clientHeight);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      const { r: rPx, capH } = dockGeometry(W, H);
      const d = 1 / Math.sin(Math.atan((rPx * 2 * tanHalf) / H));
      camera.position.set(0, 0, d);
      camera.lookAt(0, 0, 0);
      camera.setViewOffset(W, H, 0, -(H / 2 - capH + rPx), W, H);
      camera.updateProjectionMatrix();
      dotMat.uniforms.uH.value = H * renderer.getPixelRatio();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    /* ---------- loop ---------- */
    // No visibility gate: the globe is on screen for the whole page.
    let raf = 0;
    let last = performance.now();
    let time = 0;
    let sCur = 0;
    let rCur = 0; // like sCur, but for the globe's swing between regions
    let dockSpin = 0;
    const wp = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const hasOverview = !!chapters[N - 1]?.overview;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;

      // Which chapter the reader is in: the chapters are stacked in the page,
      // and a line a little below the viewport's middle, moving down through them, is the
      // progress (0 → N).
      const rect = root.getBoundingClientRect();
      const mid = window.innerHeight * 0.7; // a line lower than centre, so text is lit by the time it is read
      const sTarget = clamp((mid - rect.top) / Math.max(1, rect.height), 0, 1) * N;
      sCur += (sTarget - sCur) * (1 - Math.exp(-dt * (reduceMotion ? 20 : 2)));

      const ci = Math.min(Math.floor(sCur), N - 1);

      // The globe's own, slower position through the chapters. Same rate whether
      // or not the system asks for reduced motion: it is a glide, not a jump.
      rCur += (sTarget - rCur) * (1 - Math.exp(-dt * SWING_FOLLOW));
      const rci = Math.min(Math.floor(rCur), N - 1);
      const rnx = Math.min(rci + 1, N - 1);
      const rtr = rci < N - 1 ? smoothstep(SWING_FROM, 1.0, rCur - rci) : 0;

      const idle = reduceMotion ? 0 : Math.sin(time * 0.25) * 0.025;

      // Turns to each chapter's region as it is read, and keeps turning on its
      // own at one constant rate, DOCK_SPIN, from the first screen to the last.
      // Nothing else adds turning (an overview-chapter spin and a scroll-linked
      // turn used to, which sped it up in the last chapter and while scrolling
      // past it).
      if (!reduceMotion) dockSpin += dt * DOCK_SPIN;
      const ry = lerp(rotY[rci], rotY[rnx], rtr) + idle + dockSpin;
      const rx = lerp(rotX[rci], rotX[rnx], rtr);
      globe.rotation.set(rx, ry, 0);

      dotMat.uniforms.uTime.value = time;
      Object.values(markers).forEach((m) => (m.target = 0));

      // Arcs
      let done = 0;
      const inOverview = hasOverview && ci === N - 1;
      arcs.forEach((arc) => {
        const raw = clamp((sCur - arc.start) / (arc.end - arc.start), 0, 1);
        const e = easeInOut(raw);
        arc.e = e;
        if (e >= 0.999) done++;
        const drawn = Math.floor(e * SEG) * RAD * 6;
        arc.coreGeo.setDrawRange(0, drawn);
        arc.glowGeo.setDrawRange(0, drawn);

        const focusTarget = arc.chapter === ci || inOverview ? 1 : 0.32;
        arc.focus += (focusTarget - arc.focus) * Math.min(1, dt * 4);
        arc.coreMat.opacity = 0.95 * arc.focus;
        arc.glowMat.opacity = 0.2 * arc.focus;

        // Leading "aircraft" while the arc is being drawn
        const drawing = e > 0.001 && e < 0.999;
        arc.head.material.opacity = drawing ? 1 : 0;
        if (drawing) arc.curve.getPoint(e, arc.head.position);

        // Continuous traffic once the arc is complete
        const trafficOn = !reduceMotion && e >= 0.999;
        if (trafficOn) {
          const t = (time * arc.speed + arc.offset) % 1;
          arc.curve.getPoint(t, arc.traffic.position);
          arc.traffic.material.opacity = smoothstep(0, 0.08, t) * smoothstep(1, 0.92, t) * 0.9 * arc.focus;
        } else arc.traffic.material.opacity = 0;

        if (e > 0.001) markers[arc.from].target = Math.max(markers[arc.from].target, arc.focus);
        if (e > 0.97) markers[arc.to].target = Math.max(markers[arc.to].target, arc.focus);
      });

      // Bullet points: same start/end curve as the arcs, so the copy reveals in
      // step with the routes drawing. Driven off sCur rather than off an arc, so
      // a slide with no routes (the last one) still reveals its list.
      pointTimings.forEach((p) => {
        const row = pointEls.current[p.id];
        if (!row) return;
        const e = easeInOut(clamp((sCur - p.start) / (p.end - p.start), 0, 1));
        const shown = smoothstep(0, 0.22, e);
        row.fill.style.clipPath = `inset(0 ${((1 - e) * 100).toFixed(2)}% 0 0)`;
        row.el.style.opacity = (0.12 + 0.88 * shown).toFixed(3);
        row.el.style.transform = `translateY(${((1 - shown) * 10).toFixed(1)}px)`;
      });

      // Markers + labels
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
      Object.entries(markers).forEach(([code, m]) => {
        m.a += (m.target - m.a) * Math.min(1, dt * 6);
        m.ring.material.opacity = 0.9 * m.a;
        m.core.material.opacity = m.a;
        const ph = reduceMotion ? 0.35 : (time * 0.55 + m.phase) % 1;
        m.pulse.scale.setScalar(1 + ph * 2.6);
        m.pulse.material.opacity = (1 - ph) * 0.55 * m.a;

        const label = labelEls.current[code];
        if (!label) return;
        m.group.getWorldPosition(wp);
        nrm.copy(wp).normalize();
        camDir.copy(camera.position).sub(wp).normalize();
        const facing = nrm.dot(camDir);
        const op = m.a * smoothstep(0.12, 0.35, facing);
        wp.project(camera);
        const x = (wp.x * 0.5 + 0.5) * W;
        const y = (-wp.y * 0.5 + 0.5) * H;
        label.style.opacity = op.toFixed(3);
        label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      });


      // Progress rail: segment i fills as chapter i is read. It belongs to the
      // chapters, so it fades out once they have scrolled past.
      railEls.current.forEach((el, i) => {
        if (el) el.style.transform = `scaleX(${clamp(sCur - i, 0, 1)})`;
      });
      if (footEl.current) {
        // In as the chapters arrive (the intro sits above them), out once they
        // have scrolled past.
        footEl.current.style.opacity = (
          smoothstep(0, window.innerHeight * 0.3, mid - rect.top) *
          (1 - smoothstep(0, window.innerHeight * 0.3, mid - rect.bottom))
        ).toFixed(3);
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [routes, usedAirports, chapters, airports, color, background, tint]);

  const N = chapters.length;
  const css = `
    .sg-root{position:relative;color:#f4dadc;
      font-family:'B612',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;}
    /* Fixed: the globe is docked along the bottom edge for the whole page. It
       paints above the page ground and below the chapters and the sections that
       follow, which are positioned and come later. */
    .sg-canvas{position:fixed;inset:0;pointer-events:none;opacity:${DOCK_OPACITY}}
    .sg-canvas canvas{display:block;width:100%;height:100%}
    .sg-mono{font-family:'B612 Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    /* The chapters sit one under another in the page. */
    .sg-chapters{position:relative;margin-left:clamp(20px,5vw,72px);width:min(560px,calc(100% - 40px))}
    /* Text starts at the top of each chapter's box rather than centred in it,
       so a short chapter (three points) sits high instead of sinking. Every box
       keeps the same height: the scroll mapping assumes equal chapters. */
    .sg-chapter{display:flex;flex-direction:column;justify-content:flex-start;padding:6vh 0}
    /* The first chapter starts right under the header. */
    .sg-chapter:first-child{padding-top:1.5rem}
    .sg-title{font-size:clamp(26px,2.9vw,40px);line-height:1.08;font-weight:700;margin:0 0 22px;
      letter-spacing:-0.01em;color:#fff1f2}
    .sg-body{font-size:15px;line-height:1.62;color:#dcb9bd;margin:0 0 28px;max-width:40ch}
    /* One bullet per row: a glowing dot beside the copy, then its strip. */
    .sg-points{list-style:none;margin:0;padding:0;display:grid;gap:20px}
    .sg-point{display:grid;gap:10px;opacity:0;will-change:opacity,transform}
    .sg-point-row{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start}
    /* margin-top centres the dot on the first line rather than the box top. */
    .sg-dot{width:8px;height:8px;margin-top:0.52em;border-radius:50%;background:rgb(${tint});
      box-shadow:0 0 8px 1px rgba(${tint},0.9),0 0 18px rgba(${tint},0.5)}
    .sg-point-text{font-size:17px;line-height:1.5;color:#f0dcde}
    .sg-ai{font-style:normal;font-weight:700;color:rgb(${tint})}
    /* Voice-memo waveform: a row of centred bars in place of the old flat rule. */
    .sg-wave{position:relative;height:26px}
    .sg-wave-track,.sg-wave .sg-fill{position:absolute;inset:0;display:flex;
      align-items:center;gap:2px}
    .sg-wave i{flex:1 1 0;min-width:2px;border-radius:99px}
    .sg-wave-track i{background:rgba(${tint},0.18)}
    .sg-wave .sg-fill i{background:rgb(${tint});box-shadow:0 0 6px rgba(${tint},0.7)}
    /* Clipped rather than scaled: scaleX would squash the bars sideways instead
       of revealing them. Starts fully clipped; the loop opens it on scroll. */
    .sg-wave .sg-fill{clip-path:inset(0 100% 0 0);will-change:clip-path}
    /* Where the reader is in the chapters: one segment each, bottom left. Fixed,
       like the globe, and faded out by the loop once the chapters are behind. */
    .sg-foot{position:fixed;left:0;bottom:0;padding:22px clamp(20px,4vw,56px);pointer-events:none;opacity:0}
    .sg-rail{display:flex;gap:6px;width:min(300px,34vw)}
    .sg-seg{position:relative;flex:1;height:2px;background:rgba(${tint},0.2)}
    .sg-seg i{position:absolute;inset:0;background:rgb(${tint});transform-origin:left center;transform:scaleX(0)}
    @media (max-width:760px){
      .sg-rail{width:40vw}
      .sg-chapters{margin:0 20px;width:auto}
      .sg-title{font-size:24px;margin-bottom:14px}
      .sg-body{font-size:14px;margin-bottom:18px}
      .sg-points{gap:14px}
      .sg-point-row{gap:11px}
      .sg-point-text{font-size:15px;line-height:1.45}
      .sg-dot{width:7px;height:7px}
    }
  `;

  return (
    <section
      ref={rootRef}
      className={`sg-root ${className}`}
      style={style}
      aria-label="Flight route monitor"
    >
      <style>{css}</style>
      <div ref={canvasHostRef} className="sg-canvas" aria-hidden="true" />

      <div className="sg-chapters">
        {chapters.map((c, i) => {
          const pts = c.points || [];
          return (
            <article
              key={i}
              id={c.id}
              className="sg-chapter"
              style={{ minHeight: `${heightPerChapter}vh` }}
            >
              {/* Rendered only when set, so a blank slide collapses instead
                  of leaving an empty heading holding its margins open. */}
              {c.heading}
              {c.title && <h2 className="sg-title">{markAI(c.title)}</h2>}
              {c.body && <p className="sg-body">{markAI(c.body)}</p>}
              {pts.length > 0 && (
                <ul className="sg-points">
                  {pts.map((text, j) => (
                    <li
                      key={j}
                      className="sg-point"
                      ref={(el) => {
                        if (!el) return;
                        pointEls.current[`${i}-${j}`] = {
                          el,
                          fill: el.querySelector(".sg-fill"),
                        };
                      }}
                    >
                      <span className="sg-point-row">
                        <span className="sg-dot" aria-hidden="true" />
                        <span className="sg-point-text">{markAI(text)}</span>
                      </span>
                      <Waveform seed={i * 7 + j * 3 + 1} />
                    </li>
                  ))}
                </ul>
              )}
              {c.content}
            </article>
          );
        })}
      </div>

      <div className="sg-foot" ref={footEl} aria-hidden="true">
        <div className="sg-rail">
          {chapters.map((_, i) => (
            <span key={i} className="sg-seg">
              <i ref={(el) => (railEls.current[i] = el)} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
