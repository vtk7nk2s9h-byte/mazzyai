'use client';

import { useEffect, useId, useRef } from 'react';

import { cn } from '@/app/lib/utils';

// The head is the library's TV: a chunky rounded box, drawn in a 120 × 120 box
// with the antenna above it and an ear knob each side. The letter lives on the
// screen, not in the outline.
//
// SHELL is the box; HOLE is cut out of it, so the lighting rolls a lip round
// the screen; GLASS is the black behind, a little larger so no gap shows
// between the glass and the lip.
const SHELL = { x: 14, y: 30, w: 92, h: 74, r: 16 };
const HOLE = { x: 24, y: 41, w: 72, h: 52, r: 9 };
const GLASS = { x: 22, y: 39, w: 76, h: 56, r: 11 };

// An M in LED pixels, centred on the screen: two bars and a V between them.
const GLYPH = [
  [34, 83],
  [34, 51],
  [46.5, 51],
  [60, 66],
  [73.5, 51],
  [86, 51],
  [86, 83],
  [76, 83],
  [76, 60.2],
  [60, 78],
  [44, 60.2],
  [44, 83],
]
  .map((p) => p.join(','))
  .join(' ');

// A screw in the middle of each corner of the rim.
const SCREWS = [
  [19, 35.5],
  [101, 35.5],
  [19, 98.5],
  [101, 98.5],
];

// How far the lit M may slide on the glass to look at the pointer.
const LOOK = 2.4;
// How far the whole head turns toward it, in degrees, and how far it leans
// over, as a share of its own size.
const TURN = { y: 24, x: 18 };
const LEAN = { x: 0.06, y: 0.04 };

/**
 * The MazzyAI "M" as a robot head, in the spirit of the `robot-heads` library
 * (a glossy TV-headed bot with an LED face, ear knobs and an antenna) — drawn
 * here because the library has no red and no letter.
 *
 * The shell is a flat deep-red box with a screen cut out of it, which an SVG
 * lighting filter turns into a rolled, glossy edge, round the outside and
 * round the hole. Black glass sits behind the hole, and the M is lit on it,
 * so the robot is what you see first and the letter is its face.
 *
 * It bobs, blinks and sways its antenna on its own (the keyframes are in
 * global.css, and stop under reduced motion); the whole head turns toward the
 * pointer wherever it is on the page, with the lit M leading the turn; and it
 * hops and brightens while the pointer is over it or the button around it.
 * Decorative: the control it sits in carries the label.
 */
export function MRobot({
  size = 48,
  className,
}: {
  /** The side of the box it rests in, in px; the antenna glow reaches past it. */
  size?: number;
  className?: string;
}) {
  // useId gives ":r1:", which is awkward inside url(#…).
  const id = useId().replace(/:/g, '');
  const root = useRef<HTMLSpanElement>(null);
  const tilt = useRef<HTMLSpanElement>(null);
  const glyph = useRef<SVGGElement>(null);
  // Strong enough to read as depth, weak enough not to fish-eye a small head.
  const perspective = `perspective(${size * 5}px)`;

  useEffect(() => {
    const el = root.current;
    const head = tilt.current;
    const face = glyph.current;
    if (!el || !head || !face) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    // (x, y) is the pointer's direction, scaled 0 to 1 by how near it is: the
    // head turns and leans toward it, and the M slides a bit further the same
    // way, so the face leads the head.
    const look = (x: number, y: number) => {
      head.style.transform = `${perspective} rotateY(${x * TURN.y}deg) rotateX(${-y * TURN.x}deg) translate(${x * LEAN.x * 100}%, ${y * LEAN.y * 100}%)`;
      face.style.transform = `translate(${x * LOOK}px, ${y * LOOK}px)`;
    };
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = el.getBoundingClientRect();
        const dx = e.clientX - (box.left + box.width / 2);
        const dy = e.clientY - (box.top + box.height / 2);
        const distance = Math.hypot(dx, dy);
        if (!distance) return look(0, 0);
        // Anywhere on the page: the turn is full from about 120px away, and
        // gentler closer in, so it never snaps flat as the cursor passes over.
        const pull = Math.min(1, distance / 120);
        look((dx / distance) * pull, (dy / distance) * pull);
      });
    };
    const away = () => look(0, 0);

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', away);
    window.addEventListener('blur', away);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', away);
      window.removeEventListener('blur', away);
    };
  }, [perspective]);

  const ref = (name: string) => `url(#${id}-${name})`;

  return (
    <span
      ref={root}
      aria-hidden="true"
      className={cn('m-robot relative inline-block shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {/* The pointer's turn. Its own element: the body below is animated, and
          an animation would override a transform set here. */}
      <span
        ref={tilt}
        className="block h-full w-full will-change-transform"
        style={{
          transform: perspective,
          transition: 'transform 160ms ease-out',
        }}
      >
        <span className="m-robot-body block h-full w-full will-change-transform">
          <svg
            viewBox="0 0 120 120"
            className="block h-full w-full overflow-visible"
            style={{ filter: 'drop-shadow(0 0 6px rgba(255,46,67,0.2))' }}
          >
            <defs>
              {/* Body colour: lit from the top left, near-black maroon at the foot. */}
              <linearGradient id={`${id}-body`} x1="0.1" y1="0" x2="0.9" y2="1">
                <stop offset="0" stopColor="#c81e32" />
                <stop offset="0.45" stopColor="#8f0f1d" />
                <stop offset="1" stopColor="#3f060e" />
              </linearGradient>
              {/* The ears and the antenna's collar: a paler rose, like the
                  library's steel trim, shaded round the cylinder. */}
              <linearGradient id={`${id}-trim`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#f3b9c0" />
                <stop offset="0.5" stopColor="#c9737f" />
                <stop offset="1" stopColor="#7a2a38" />
              </linearGradient>
              <linearGradient id={`${id}-stem`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#e9a4ac" />
                <stop offset="1" stopColor="#8a3040" />
              </linearGradient>
              <radialGradient id={`${id}-knob`} cx="0.38" cy="0.35" r="0.7">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.45" stopColor="#ff7c8a" />
                <stop offset="1" stopColor="#ff2e43" />
              </radialGradient>
              <linearGradient id={`${id}-led`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ff5a6a" />
                <stop offset="1" stopColor="#b3162a" />
              </linearGradient>
              {/* A faint reflection across the black glass. */}
              <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0.6" y2="0.9">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.2" />
                <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              {/* The LED grid: thin dark lines over a lit face, so it reads as a
                  matrix of pixels rather than a solid shape. */}
              <pattern
                id={`${id}-grid`}
                width="2.2"
                height="2.2"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M0 0H2.2M0 0V2.2"
                  stroke="#14040a"
                  strokeOpacity="0.42"
                  strokeWidth="0.45"
                  fill="none"
                />
              </pattern>
              {/* Cuts the screen out of the shell. It has to be applied to the
                  shape inside the filtered group: the lighting is worked out
                  from what the filter is handed, so a hole cut afterwards
                  would have no lip. */}
              <mask
                id={`${id}-hole`}
                maskUnits="userSpaceOnUse"
                x="-10"
                y="-10"
                width="140"
                height="140"
              >
                <rect x="-10" y="-10" width="140" height="140" fill="#fff" />
                <rect
                  x={HOLE.x}
                  y={HOLE.y}
                  width={HOLE.w}
                  height={HOLE.h}
                  rx={HOLE.r}
                  fill="#000"
                />
              </mask>

              {/* The shell. Blur and threshold the silhouette to round every
                  corner, blur that into a height map, and light it: diffuse
                  light shades the rolled edge, a specular pass puts the gloss
                  on it. */}
              <filter
                id={`${id}-shell`}
                x="-6%"
                y="-6%"
                width="112%"
                height="112%"
                colorInterpolationFilters="sRGB"
              >
                <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="rounded" />
                <feColorMatrix
                  in="rounded"
                  type="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 20 -9"
                  result="mask"
                />
                <feGaussianBlur in="mask" stdDeviation="3" result="height" />
                <feDiffuseLighting
                  in="height"
                  surfaceScale="6"
                  diffuseConstant="1.15"
                  lightingColor="#ffffff"
                  result="diffuse"
                >
                  <feDistantLight azimuth="235" elevation="55" />
                </feDiffuseLighting>
                <feSpecularLighting
                  in="height"
                  surfaceScale="6"
                  specularConstant="0.55"
                  specularExponent="28"
                  lightingColor="#ffb9c0"
                  result="specular"
                >
                  <feDistantLight azimuth="235" elevation="55" />
                </feSpecularLighting>
                <feComposite in="SourceGraphic" in2="mask" operator="in" result="body" />
                <feComposite
                  in="body"
                  in2="diffuse"
                  operator="arithmetic"
                  k1="1"
                  k2="0"
                  k3="0"
                  k4="0"
                  result="shaded"
                />
                <feComposite in="specular" in2="mask" operator="in" result="gloss" />
                <feComposite
                  in="shaded"
                  in2="gloss"
                  operator="arithmetic"
                  k1="0"
                  k2="1"
                  k3="1"
                  k4="0"
                />
              </filter>
              <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {/* Floor shadow. */}
            <ellipse
              cx="60"
              cy="111"
              rx="42"
              ry="4.5"
              fill="#000"
              opacity="0.55"
              filter={ref('soft')}
            />

            {/* The ears: a knob each side, behind the shell so only the outer
                end shows. */}
            {[5, 101].map((x) => (
              <g key={x}>
                <rect x={x} y="60" width="14" height="22" rx="6" fill={ref('trim')} />
                <rect
                  x={x}
                  y="60"
                  width="14"
                  height="22"
                  rx="6"
                  fill="none"
                  stroke="#2a0409"
                  strokeOpacity="0.45"
                  strokeWidth="0.8"
                />
              </g>
            ))}

            {/* Behind the shell, so the collar sits down on the roof. The group
                sways from its foot (see .m-robot-antenna). */}
            <g className="m-robot-antenna">
              <circle
                className="m-robot-light"
                cx="60"
                cy="11"
                r="9"
                fill="#ff2e43"
                opacity="0.45"
                filter={ref('soft')}
              />
              <rect x="58.9" y="13" width="2.2" height="20" rx="1.1" fill={ref('stem')} />
              <rect x="53" y="24" width="14" height="9" rx="3" fill={ref('trim')} />
              <circle cx="60" cy="11" r="4.6" fill={ref('knob')} />
            </g>

            {/* The black glass, seen through the shell's hole. */}
            <rect
              x={GLASS.x}
              y={GLASS.y}
              width={GLASS.w}
              height={GLASS.h}
              rx={GLASS.r}
              fill="#08020a"
            />
            <rect
              x={GLASS.x}
              y={GLASS.y}
              width={GLASS.w}
              height={GLASS.h}
              rx={GLASS.r}
              fill={ref('glass')}
            />

            {/* The shell. The stroke fattens the box by 2.5 each side so the
                filter's rounding has colour to fill the corners with. */}
            <g filter={ref('shell')}>
              <rect
                x={SHELL.x}
                y={SHELL.y}
                width={SHELL.w}
                height={SHELL.h}
                rx={SHELL.r}
                fill={ref('body')}
                stroke={ref('body')}
                strokeWidth="5"
                mask={ref('hole')}
              />
            </g>

            {/* Screws in the corners of the rim. */}
            {SCREWS.map(([x, y], i) => (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r="1.9"
                  fill="#5c0b16"
                  stroke="#ffb3bb"
                  strokeOpacity="0.4"
                  strokeWidth="0.5"
                />
                <path
                  d={`M${x - 1} ${y + 0.7}L${x + 1} ${y - 0.7}`}
                  stroke="#1f0307"
                  strokeWidth="0.5"
                  strokeLinecap="round"
                />
              </g>
            ))}

            {/* The face. Slides as one to follow the pointer; the inner group
                blinks and brightens (CSS filter and animation would replace
                the glow, so they sit one level out). */}
            <g ref={glyph} style={{ transition: 'transform 140ms ease-out' }}>
              <g className="m-robot-glyph">
                <g filter={ref('glow')}>
                  <polygon
                    points={GLYPH}
                    fill={ref('led')}
                    stroke={ref('led')}
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <polygon points={GLYPH} fill={ref('grid')} />
                </g>
              </g>
            </g>
          </svg>
        </span>
      </span>
    </span>
  );
}
