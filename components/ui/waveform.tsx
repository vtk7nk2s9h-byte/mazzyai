'use client';

// Canvas bar waveform with the same exports and props as the ElevenLabs UI
// Waveform (https://ui.elevenlabs.io/docs/components/waveform), limited to the
// two pieces in use: Waveform and AudioScrubber. Their registry was refusing
// the CLI (HTTP 429), so this follows the documented API rather than the
// original source — replacing this file with the original is a drop-in swap.

import { useCallback, useEffect, useRef } from 'react';

import { cn } from '@/app/lib/utils.ts';

export type WaveformProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> & {
  /** Bar heights, each between 0 and 1. Resampled to however many bars fit. */
  data?: number[];
  barWidth?: number;
  /** The shortest a bar gets, in pixels. */
  barHeight?: number;
  barGap?: number;
  barRadius?: number;
  /** Any CSS colour. Defaults to the current text colour. */
  barColor?: string;
  fadeEdges?: boolean;
  fadeWidth?: number;
  height?: string | number;
  onBarClick?: (index: number, value: number) => void;
};

/** `data` averaged into `count` buckets, so any length of data fits any width. */
function resample(data: number[], count: number) {
  if (count <= 0 || data.length === 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const from = Math.floor((i / count) * data.length);
    const to = Math.max(from + 1, Math.floor(((i + 1) / count) * data.length));
    let sum = 0;
    for (let j = from; j < to; j++) sum += data[j] ?? 0;
    return sum / (to - from);
  });
}

/**
 * Draws the bars on a canvas and keeps it sharp on high-DPI screens. `paint`
 * decides each bar's colour, which is how AudioScrubber shades played bars.
 */
function useBarCanvas(
  { data = [], barWidth = 4, barHeight = 4, barGap = 2, barRadius = 2, fadeEdges = true, fadeWidth = 24 }: WaveformProps,
  colorFor: (index: number, count: number) => string,
  // Redrawn when this changes, e.g. the playback position.
  redrawKey: unknown,
) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const el = host.current;
    const c = canvas.current;
    if (!el || !c) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const g = c.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const count = Math.floor((w + barGap) / (barWidth + barGap));
    const bars = resample(data, count);
    // Centred, so the bars stay symmetrical if the width isn't a whole number of them.
    const x0 = (w - (bars.length * (barWidth + barGap) - barGap)) / 2;
    bars.forEach((v, i) => {
      const bh = Math.max(barHeight, v * h);
      g.fillStyle = colorFor(i, bars.length);
      g.beginPath();
      g.roundRect(x0 + i * (barWidth + barGap), (h - bh) / 2, barWidth, bh, barRadius);
      g.fill();
    });

    if (fadeEdges && fadeWidth > 0 && w > fadeWidth * 2) {
      const fade = g.createLinearGradient(0, 0, w, 0);
      const f = fadeWidth / w;
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(f, 'rgba(0,0,0,1)');
      fade.addColorStop(1 - f, 'rgba(0,0,0,1)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = fade;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    }
  }, [data, barWidth, barHeight, barGap, barRadius, fadeEdges, fadeWidth, colorFor]);

  useEffect(() => {
    draw();
  }, [draw, redrawKey]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);

  return { host, canvas };
}

export function Waveform(props: WaveformProps) {
  const { data = [], barWidth = 4, barGap = 2, barColor, height = 128, onBarClick, className, style, ...rest } = props;
  const colorFor = useCallback(() => barColor ?? 'currentColor', [barColor]);
  const { host, canvas } = useBarCanvas(props, colorFor, null);

  const click = (e: React.MouseEvent) => {
    if (!onBarClick || !host.current) return;
    const rect = host.current.getBoundingClientRect();
    const count = Math.floor((rect.width + barGap) / (barWidth + barGap));
    const bars = resample(data, count);
    const i = Math.min(bars.length - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * bars.length)));
    onBarClick(i, bars[i] ?? 0);
  };

  return (
    <div
      ref={host}
      role="img"
      aria-label="Audio waveform"
      className={cn('relative w-full text-foreground', className)}
      style={{ height, ...style }}
      onClick={click}
      {...stripWaveformProps(rest)}
    >
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

// Props meant for the canvas, not the wrapper <div>.
function stripWaveformProps<T extends object>(rest: T) {
  const {
    data: _d, barHeight: _bh, barRadius: _br, fadeEdges: _fe, fadeWidth: _fw, ...dom
  } = rest as Record<string, unknown>;
  void [_d, _bh, _br, _fe, _fw];
  return dom as React.HTMLAttributes<HTMLDivElement>;
}

export type AudioScrubberProps = WaveformProps & {
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  /** The vertical line at the playback position. Default: true. */
  showHandle?: boolean;
};

/**
 * A waveform you can click or drag to seek: bars before `currentTime` are drawn
 * in full colour, the rest dimmed, with a handle at the position between.
 */
export function AudioScrubber({
  currentTime,
  duration,
  onSeek,
  showHandle = true,
  barColor = 'currentColor',
  data = [],
  height = 128,
  className,
  style,
  ...rest
}: AudioScrubberProps) {
  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const colorFor = useCallback(
    (i: number, count: number) => (i / count < progress ? barColor : `color-mix(in srgb, ${barColor} 28%, transparent)`),
    [barColor, progress],
  );
  const { host, canvas } = useBarCanvas({ ...rest, data }, colorFor, progress);
  const dragging = useRef(false);

  const seekTo = (clientX: number) => {
    if (!onSeek || !host.current || duration <= 0) return;
    const rect = host.current.getBoundingClientRect();
    onSeek(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration);
  };

  return (
    <div
      ref={host}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      className={cn('relative w-full cursor-pointer touch-none select-none text-foreground', className)}
      style={{ height, ...style }}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        seekTo(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && seekTo(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      onKeyDown={(e) => {
        if (!onSeek) return;
        if (e.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5));
        if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
      }}
    >
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      {showHandle && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-current"
          style={{ left: `${progress * 100}%`, color: barColor }}
        />
      )}
    </div>
  );
}
