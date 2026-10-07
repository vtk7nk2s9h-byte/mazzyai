'use client';

// A glowing orb that reacts to an agent's state and voice, with the same
// exports and props as the ElevenLabs UI Orb
// (https://ui.elevenlabs.io/docs/components/orb): Orb and AgentState, with
// `colors`, `colorsRef`, `seed`, `agentState` and the volume props. Their
// registry was refusing both CLIs (a Vercel security checkpoint, HTTP 429), so
// this is written on plain three.js — already a dependency — rather than copied
// from the original. Replacing this file with the original is a drop-in swap,
// apart from @react-three/fiber and drei, which that one also needs.

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';

import { cn } from '@/app/lib/utils.ts';

/** null is idle. */
export type AgentState = null | 'thinking' | 'listening' | 'talking';

export type OrbProps = {
  /** The two colours the orb blends between. */
  colors?: [string, string];
  /** Gives each orb its own pattern, so two on a page don't move in step. */
  seed?: number;
  agentState?: AgentState;
  /** Colours read live each frame, for changing them without a re-render. */
  colorsRef?: RefObject<[string, string]>;
  /**
   * What the orb hears and says, each 0 to 1. "auto" reads the functions or refs
   * below; "manual" uses manualInput and manualOutput.
   */
  volumeMode?: 'auto' | 'manual';
  manualInput?: number;
  manualOutput?: number;
  inputVolumeRef?: RefObject<number>;
  outputVolumeRef?: RefObject<number>;
  getInputVolume?: () => number;
  getOutputVolume?: () => number;
  className?: string;
};

// How lively the orb is in each state: `energy` scales the swirl and pulse,
// `speed` the flow. Idle is a slow breath; thinking turns faster without
// pulsing; listening is a gentle even pulse; talking is the most animated.
const STATES: Record<
  'idle' | 'thinking' | 'listening' | 'talking',
  { energy: number; speed: number }
> = {
  idle: { energy: 0.12, speed: 0.25 },
  thinking: { energy: 0.4, speed: 1.1 },
  listening: { energy: 0.5, speed: 0.5 },
  talking: { energy: 1, speed: 0.9 },
};

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSeed;
  uniform float uEnergy;
  uniform float uPulse;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.02 + 7.3;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    // The edge is antialiased over a couple of pixels' worth of radius.
    float disc = 1.0 - smoothstep(0.96, 1.0, r);
    if (disc <= 0.0) { gl_FragColor = vec4(0.0); return; }

    // A pulse swells the orb a little: more with energy, in step with uPulse.
    float swell = 1.0 + uPulse * 0.06 * uEnergy;
    vec2 q = p / swell;

    // Two layers of warped noise, drifting on the seed so each orb differs.
    vec2 s = vec2(uSeed * 0.013, uSeed * 0.021);
    float t = uTime;
    vec2 w = vec2(
      fbm(q * 1.6 + s + t * 0.35),
      fbm(q * 1.6 - s - t * 0.28 + 3.1)
    );
    float n = fbm(q * 1.4 + (w - 0.5) * (1.2 + uEnergy * 2.2) + t * 0.15);

    vec3 col = mix(uColorB, uColorA, smoothstep(0.25, 0.8, n));

    // A soft highlight and a darker rim give the disc some body.
    float rim = smoothstep(0.55, 1.0, r);
    col *= mix(1.18, 0.55, rim);
    col += uColorA * 0.25 * (1.0 - r) * (0.4 + uEnergy);

    // Rings moving outward while it is active (listening and talking).
    float ring = smoothstep(0.06, 0.0, abs(fract(r * 2.2 - t * 0.6) - 0.5) - 0.42);
    col += uColorA * ring * 0.18 * uEnergy * (1.0 - r);

    gl_FragColor = vec4(col, 1.0) * disc;
  }
`;

/**
 * Draws the orb on a canvas that fills its box — size it from outside, and clip
 * it to a circle there if wanted. It loops only while mounted and visible, and
 * eases between states instead of snapping.
 */
export function Orb({
  colors = ['#ff6b78', '#8c1925'],
  seed = 1000,
  agentState = null,
  colorsRef: liveColors,
  volumeMode = 'auto',
  manualInput,
  manualOutput,
  inputVolumeRef,
  outputVolumeRef,
  getInputVolume,
  getOutputVolume,
  className,
}: OrbProps) {
  const host = useRef<HTMLDivElement>(null);
  // The loop reads these, so a new state or colour needs no new scene.
  const target = useRef(STATES.idle);
  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  // The caller's own ref object, read each frame (not copied at render).
  const liveColorsRef = useRef(liveColors);
  liveColorsRef.current = liveColors;
  target.current = STATES[agentState ?? 'idle'];
  // The loop reads the volume through this, so new props need no new scene.
  const volume = useRef<() => number>(() => 0);
  volume.current = () => {
    const clamp = (v: number | undefined) =>
      Math.min(1, Math.max(0, Number.isFinite(v) ? (v as number) : 0));
    if (volumeMode === 'manual') {
      return Math.max(clamp(manualInput), clamp(manualOutput));
    }
    return Math.max(
      clamp(getInputVolume?.() ?? inputVolumeRef?.current),
      clamp(getOutputVolume?.() ?? outputVolumeRef?.current),
    );
  };

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return; // No WebGL: the orb is decoration, so show nothing.
    }
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: seed },
        uEnergy: { value: STATES.idle.energy },
        uPulse: { value: 0 },
        uColorA: { value: new THREE.Color(colors[0]) },
        uColorB: { value: new THREE.Color(colors[1]) },
      },
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    const camera = new THREE.Camera();

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);

    // Timer, not Clock (deprecated). Unlike Clock, getDelta()
    // only reads the value update() stored, so update() runs every frame —
    // hidden ones included, which is what keeps the first frame back from
    // seeing the whole time spent hidden.
    const timer = new THREE.Timer();
    let time = 0;
    let energy: number = STATES.idle.energy;
    let speed: number = STATES.idle.speed;
    let level = 0;
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      timer.update();
      if (!visible || document.hidden) return;
      const dt = Math.min(timer.getDelta(), 0.1);
      // Ease toward the state's values, so a change reads as a transition.
      const k = 1 - Math.exp(-dt * 4);
      energy += (target.current.energy - energy) * k;
      speed += (target.current.speed - speed) * k;

      // Volume lifts the orb on top of its state: quick to rise, slower to fall.
      const v = volume.current();
      level += (v - level) * (1 - Math.exp(-dt * (v > level ? 18 : 6)));

      time += dt * (speed + level * 0.8) * (reduced ? 0.3 : 1);
      const u = material.uniforms;
      u.uTime.value = time + seed;
      const lively = Math.min(1.4, energy + level * 0.7);
      u.uEnergy.value = reduced ? lively * 0.4 : lively;
      // Talking beats faster than listening, which is faster than idle.
      u.uPulse.value = Math.sin(time * (2 + lively * 6)) * 0.5 + 0.5 + level;
      const [a, b] = liveColorsRef.current?.current ?? colorsRef.current;
      u.uColorA.value.set(a);
      u.uColorB.value.set(b);
      renderer.render(scene, camera);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // Colours are read live through the ref; the scene is built once per seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  return <div ref={host} className={cn('h-full w-full', className)} aria-hidden="true" />;
}
