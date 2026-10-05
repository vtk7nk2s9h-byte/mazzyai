'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

import samplePeaks from '@/public/audio/sample-call.peaks.json';
import { AudioScrubber } from '@/components/ui/waveform';

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/**
 * A playable call recording: play/pause, and a waveform you can click or drag
 * to seek. Styled like the use-case card it sits beside.
 *
 * `peaks` is the recording's loudness over time, 0 to 1, drawn as the bars. It
 * is data rather than decoded in the page, so nothing downloads the audio until
 * someone presses play. To use another recording, put it in public/audio and run
 * `node scripts/audio-peaks.mjs public/audio/<name>.wav` for its peaks file.
 */
export default function CallRecording({
  src = '/audio/sample-call.wav',
  peaks = samplePeaks,
  title = 'Restaurant booking',
  subtitle = 'A sample call: the agent takes a table reservation.',
  embedded = false,
}: {
  /** Drops the card chrome, for sitting inside another card. */
  embedded?: boolean;
  src?: string;
  peaks?: number[];
  title?: string;
  subtitle?: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // The metadata can arrive before React has attached onLoadedMetadata, and the
  // event is not repeated, so read it once from the element as well.
  useEffect(() => {
    const el = audio.current;
    if (el && el.readyState >= 1) setDuration(el.duration);
  }, []);

  // The audio element's own timeupdate fires a few times a second, which makes
  // the handle step along; reading the clock every frame while playing keeps it smooth.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      if (audio.current) setTime(audio.current.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  function seek(to: number) {
    if (audio.current) audio.current.currentTime = to;
    setTime(to);
  }

  return (
    // Standalone, -mt-8 pulls it up into the explorer's bottom margin, so the
    // gap above and below it is the same.
    <div
      className={
        embedded
          ? 'relative'
          : '-mt-8 mb-16 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl md:p-6'
      }
    >
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          seek(0);
        }}
      />

      <p className="text-xs font-medium uppercase tracking-[0.28em] text-gray-400">
        Hear it live
      </p>
      <div className="mt-3 flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause the call' : 'Play the call'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-red-lit/50 bg-maroon-500/30 text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
        >
          {playing ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          )}
        </button>

        <div className="min-w-0 grow">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="truncate text-base font-semibold tracking-tight text-gray-900">
              {title}
            </h3>
            <span className="shrink-0 font-mono text-xs tabular-nums text-gray-500">
              {clock(time)} / {clock(duration)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>

      <AudioScrubber
        data={peaks}
        currentTime={time}
        duration={duration}
        onSeek={seek}
        height={64}
        barWidth={3}
        barGap={2}
        barRadius={2}
        barColor="#ff2e43"
        fadeEdges={false}
        className="mt-4"
      />
    </div>
  );
}
