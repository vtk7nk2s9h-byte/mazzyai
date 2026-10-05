'use client';

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import {
  ArrowDown,
  BellRing,
  BookOpenCheck,
  CalendarCheck2,
  Clock3,
  FileText,
  Moon,
  Pause,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  Play,
  ScrollText,
  Stethoscope,
  Sunrise,
  Sunset,
  UserPlus,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/app/lib/utils.ts';
import { b612 } from '@/app/ui/fonts';
import { Orb, type AgentState } from '@/components/ui/orb';
import {
  industryOptions,
  sectorIcons,
} from '@/components/ui/use-case-explorer';

/* ------------------------------------------------------------------ */
/*  The example calls                                                  */
/* ------------------------------------------------------------------ */

type Speaker = 'agent' | 'caller';

type Scene = {
  /** The tab's label. */
  sector: string;
  icon: LucideIcon;
  business: string;
  /** When the call comes in: one each for morning, evening and night. */
  time: string;
  timeIcon: LucideIcon;
  caller: string;
  lines: [Speaker, string][];
  /** What is waiting in the dashboard once the call ends. */
  outcomes: { icon: LucideIcon; title: string; detail: string }[];
  /** The whole call in a sentence, for screen readers (the animation is hidden from them). */
  summary: string;
};

// Every outcome is something the dashboard really does: bookings land on the
// agenda, calls in the call log with a summary, callers in contacts.
const SCENES: Scene[] = [
  {
    sector: 'Restaurant',
    icon: UtensilsCrossed,
    business: 'Casa Olivo',
    time: '18:42',
    timeIcon: Sunset,
    caller: 'Emma',
    lines: [
      ['agent', 'Good evening, Casa Olivo. How can I help?'],
      ['caller', 'Hi! Do you have a table for four on Friday?'],
      ['agent', 'We do: 8 pm by the window, or 8:30 in the garden.'],
      ['caller', 'The window at 8, please.'],
      ['agent', 'Booked: four guests, Friday at 8 pm. See you then!'],
    ],
    outcomes: [
      { icon: CalendarCheck2, title: 'Booked into your agenda', detail: 'Fri 20:00 · table for 4' },
      { icon: FileText, title: 'Call logged', detail: 'Summary and transcript saved' },
      { icon: UserPlus, title: 'Caller saved', detail: 'Emma added to your contacts' },
    ],
    summary:
      'A caller asks Casa Olivo for a table for four on Friday. The agent offers two times, books 8 pm, adds it to the agenda, logs the call and saves the caller as a contact.',
  },
  {
    sector: 'Dental clinic',
    icon: Stethoscope,
    business: 'Northgate Dental',
    time: '07:58',
    timeIcon: Sunrise,
    caller: 'Daniel',
    lines: [
      ['agent', 'Northgate Dental, good morning. How can I help?'],
      ['caller', "I've lost a filling. Can someone see me this week?"],
      ['agent', 'Dr. Haddad has Thursday at 9:15 or 14:40. Which suits you?'],
      ['caller', '9:15, please.'],
      ['agent', "You're booked: Thursday at 9:15 with Dr. Haddad."],
    ],
    outcomes: [
      { icon: CalendarCheck2, title: 'Appointment booked', detail: 'Thu 09:15 · Dr. Haddad' },
      { icon: FileText, title: 'Call logged', detail: 'Reason for the visit noted' },
      { icon: UserPlus, title: 'Patient saved', detail: 'Daniel added to your contacts' },
    ],
    summary:
      'Before opening time, a patient with a lost filling calls Northgate Dental. The agent books Thursday at 9:15 with Dr. Haddad, logs the call and saves the patient as a contact.',
  },
  {
    sector: 'Plumber',
    icon: Wrench,
    business: 'Van Dijk Plumbing',
    time: '23:47',
    timeIcon: Moon,
    caller: 'Sofia',
    lines: [
      ['agent', "Van Dijk Plumbing, out-of-hours line. What's happened?"],
      ['caller', "A pipe burst under the sink. There's water everywhere!"],
      ['agent', "I'm alerting the on-call engineer now. What's the address?"],
      ['caller', '14 Canal Street, flat 2.'],
      ['agent', 'Thanks. Mark is on his way and will call you shortly.'],
    ],
    outcomes: [
      { icon: BellRing, title: 'Engineer alerted', detail: 'Marked urgent, on-call notified' },
      { icon: FileText, title: 'Call logged', detail: 'Address and fault captured' },
      { icon: UserPlus, title: 'Caller saved', detail: 'Sofia added to your contacts' },
    ],
    summary:
      'At 23:47 a caller reports a burst pipe to Van Dijk Plumbing. The agent alerts the on-call engineer, takes the address, logs the call and saves the caller as a contact.',
  },
];

// The pace of a call. Words appear at roughly speaking speed, with a beat
// before each reply, as on a real line.
const RING_MS = 1900; // the phone rings this long before the agent picks up
const WORD_MS = 210; // one spoken word
const TURN_MS = 550; // the pause before each line
const OUTCOME_MS = 500; // between the after-call rows appearing
const HOLD_MS = 4500; // a finished call stays on screen this long
const TICK_MS = 60;

type TimedLine = { who: Speaker; words: string[]; start: number; end: number };
type Timeline = {
  lines: TimedLine[];
  /** When the call ends. */
  ended: number;
  /** When the last outcome row is in: the finished state. */
  settled: number;
  /** When the next call starts. */
  total: number;
};

/** When each line starts and ends, from the script alone. */
function timeline(scene: Scene): Timeline {
  let at = RING_MS;
  const lines = scene.lines.map(([who, text]) => {
    const words = text.split(' ');
    const start = at + TURN_MS;
    at = start + words.length * WORD_MS;
    return { who, words, start, end: at };
  });
  const ended = at + TURN_MS;
  const settled = ended + scene.outcomes.length * OUTCOME_MS;
  return { lines, ended, settled, total: settled + HOLD_MS };
}

const TIMELINES = SCENES.map(timeline);

/**
 * Everything the card shows at `t` ms into a call. Derived from the time alone
 * rather than stepped through, so pausing, switching calls and reduced motion
 * (which jumps straight to the finished call) are all just a different `t`.
 */
function frameAt(tl: Timeline, t: number) {
  const ringing = t < RING_MS;
  const ended = t >= tl.ended;
  // The line being spoken, or about to be (its beat before).
  const current = tl.lines.find((l) => t >= l.start - TURN_MS && t < l.end);

  let orb: AgentState = null;
  if (current?.who === 'agent') orb = t >= current.start ? 'talking' : 'thinking';
  else if (current) orb = 'listening';

  return {
    ringing,
    ended,
    orb,
    /** How many words of each line have been said. */
    spoken: tl.lines.map((l) =>
      t < l.start
        ? 0
        : Math.min(l.words.length, Math.floor((t - l.start) / WORD_MS) + 1),
    ),
    outcomes: ended ? Math.floor((t - tl.ended) / OUTCOME_MS) + 1 : 0,
    seconds: Math.max(0, Math.floor((Math.min(t, tl.ended) - RING_MS) / 1000)),
  };
}

type Clock = { scene: number; t: number };
type ClockAction =
  | { type: 'tick'; dt: number }
  | { type: 'pick'; scene: number; t: number };

/** Moves the call on, and on to the next call once one has been shown. */
function advance(clock: Clock, action: ClockAction): Clock {
  if (action.type === 'pick') return { scene: action.scene, t: action.t };
  const t = clock.t + action.dt;
  return t < TIMELINES[clock.scene].total
    ? { scene: clock.scene, t }
    : { scene: (clock.scene + 1) % SCENES.length, t: 0 };
}

/* ------------------------------------------------------------------ */
/*  Static content                                                     */
/* ------------------------------------------------------------------ */

// The old "What is an AI Voice Agent" chapter, condensed to four claims.
const PROOF = [
  {
    icon: Clock3,
    title: 'Open around the clock',
    detail: 'Nights, weekends and holidays, when most calls go unanswered.',
  },
  {
    icon: PhoneForwarded,
    title: 'Your existing number',
    detail: 'No new line and no hardware. Calls simply get answered.',
  },
  {
    icon: BookOpenCheck,
    title: 'Trained on your business',
    detail: 'Your hours, services and policies, never a generic script.',
  },
  {
    icon: ScrollText,
    title: 'Every call on record',
    detail: 'Transcript, summary and sentiment, in your dashboard.',
  },
];

// The use-case explorer's own list, so the two never disagree. "Other / My
// business isn't listed" is a form option, not a kind of business.
const TICKER = industryOptions.flatMap(({ sector, businesses }) =>
  businesses
    .filter((name) => !name.startsWith('Other'))
    .map((name) => ({ name, icon: sectorIcons[sector] })),
);

/**
 * Peak heights and timings for the voice bars. Worked out from fixed numbers
 * rather than Math.random(), which would render differently on the server and
 * the client and trip a hydration mismatch.
 */
const BARS = Array.from({ length: 44 }, (_, i) => {
  const peak = Math.abs(Math.sin(i * 1.7) * 0.6 + Math.sin(i * 0.53) * 0.4);
  return {
    '--h': (0.35 + 0.65 * peak).toFixed(2),
    '--d': `${(0.75 + ((i * 7) % 5) * 0.12).toFixed(2)}s`,
    '--delay': `-${((i * 0.137) % 1).toFixed(2)}s`,
  } as CSSProperties;
});

const ASSISTANT_ID = 'voice-assistant'; // the voice widget's <details>
const EXPLORE_ID = 'explore'; // the use-case explorer's globe chapter

/** Scrolls to an element by id; false when it isn't on the page. */
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  return true;
}

/**
 * Opens the voice widget and puts focus on its call button, so the next press
 * starts a call. The widget renders nothing when its Retell keys aren't set;
 * then the explorer is the next best place to send someone.
 */
function openAssistant() {
  const widget = document.getElementById(ASSISTANT_ID);
  if (!(widget instanceof HTMLDetailsElement)) {
    scrollToId(EXPLORE_ID);
    return;
  }
  widget.open = true;
  widget.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
}

/* ------------------------------------------------------------------ */
/*  The section                                                        */
/* ------------------------------------------------------------------ */

/**
 * The landing page's first screen: what MazzyAI is, then an example call
 * playing out beside it, then a ticker of the businesses it is built for.
 *
 * It sits above ScrollGlobe in the page and above its fixed globe layer
 * (z-10), so the globe shows behind it rather than over it. One Pause button
 * stops everything that moves here: the call, its voice bars and the ticker.
 */
export default function IntroHero() {
  const [paused, setPaused] = useState(false);

  // overflow-x-clip: the glows reach past the edges on a phone. Clip rather
  // than hidden, which would make the section a scroll container.
  return (
    <section
      id="intro"
      aria-labelledby="intro-heading"
      data-motion={paused ? 'paused' : 'running'}
      className="group/intro relative z-10 flex min-h-[calc(100svh-5rem)] flex-col overflow-x-clip"
    >
      {/* Light in the room: wine from the top left, the brand red behind the
          call card. Behind everything else in the section. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-40 -top-48 h-[36rem] w-[46rem] rounded-full bg-maroon-500/25 blur-[140px]" />
        <div className="absolute right-[4%] top-[14%] h-[30rem] w-[30rem] rounded-full bg-brand-red-lit/[0.09] blur-[120px]" />
      </div>

      {/* On a phone the order is copy, call, claims, so the call comes
          before a long list. On a wide screen copy and claims stack on the
          left and the call spans both rows on the right. */}
      <div className="hero-grid mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-12 px-6 pb-14 pt-10 md:px-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-x-16 lg:gap-y-10 lg:pb-12 lg:pt-12 lg:[grid-template-areas:'copy_call'_'proof_call']">
        <Pitch />
        <LiveCall paused={paused} onTogglePause={() => setPaused((p) => !p)} />
        <Proof />
      </div>

      <Ticker />
    </section>
  );
}

/** The copy's entrance: each element rises in after the one before it. */
const ENTER =
  'animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-700 motion-reduce:animate-none';
const after = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

function Pitch() {
  return (
    <div className="relative lg:self-end lg:[grid-area:copy]">
      {/* A dark pool under the copy, so the globe rising behind it stays
          texture instead of noise behind the words. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-16 -inset-y-14 -z-10 bg-[radial-gradient(closest-side,rgba(9,2,3,0.8),transparent)]"
      />

      <p
        style={after(0)}
        className={cn(
          ENTER,
          'inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] py-1.5 pl-3 pr-4 text-[11px] font-medium uppercase tracking-[0.22em] text-gray-600 backdrop-blur-md',
        )}
      >
        <span aria-hidden="true" className="relative flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-red-lit opacity-60 group-data-[motion=paused]/intro:[animation-play-state:paused] motion-reduce:animate-none" />
          <span className="relative h-2 w-2 rounded-full bg-brand-red-lit shadow-[0_0_10px_rgba(255,46,67,0.9)]" />
        </span>
        AI voice agent · Answers 24/7
      </p>

      <h1
        id="intro-heading"
        className={cn(
          b612.className,
          'hero-title mt-7 text-balance text-[clamp(2.4rem,4vw,3.4rem)] font-bold leading-[1.08] tracking-[-0.025em] text-gray-900',
        )}
      >
        <span style={after(90)} className={cn(ENTER, 'block')}>
          Every call{' '}
          <span className="relative inline-block whitespace-nowrap">
            <span className="bg-gradient-to-r from-[#ff2e43] via-[#ff5b6b] to-[#ff9aa5] bg-clip-text text-transparent">
              answered.
            </span>
            {/* Drawn in once, after the words land. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 250 10"
              preserveAspectRatio="none"
              className="pointer-events-none absolute -bottom-[0.1em] left-[1%] h-[0.2em] w-[96%] overflow-visible text-brand-red-lit [filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))]"
            >
              <path
                d="M3 7 C 70 2, 160 1, 247 5"
                pathLength={1}
                className="hero-draw"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
              />
            </svg>
          </span>
        </span>
        <span style={after(180)} className={cn(ENTER, 'block text-gray-500')}>
          Every caller remembered.
        </span>
      </h1>

      <p
        style={after(280)}
        className={cn(
          ENTER,
          'hero-lede mt-7 max-w-xl text-base leading-relaxed text-gray-600 md:text-lg',
        )}
      >
        MazzyAI picks up on the first ring, day or night. It speaks naturally,
        knows your hours, services and policies, and works on the number you
        already have. Then it writes every call into your dashboard.
      </p>

      <div style={after(380)} className={cn(ENTER, 'hero-actions mt-9')}>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openAssistant}
            className="inline-flex h-12 items-center gap-3 rounded-full bg-gradient-to-b from-[#ff3b4f] to-[#b51c2e] pl-2 pr-6 text-sm font-semibold text-white shadow-[0_14px_40px_-12px_rgba(255,46,67,0.75),inset_0_1px_0_rgba(255,255,255,0.25)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_-12px_rgba(255,46,67,0.95),inset_0_1px_0_rgba(255,255,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit focus-visible:ring-offset-2 focus-visible:ring-offset-[#090203] active:translate-y-0"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
              <PhoneCall className="h-4 w-4" strokeWidth={2} />
            </span>
            Talk to our agent
          </button>
          <a
            href={`#${EXPLORE_ID}`}
            onClick={(e: MouseEvent<HTMLAnchorElement>) => {
              if (scrollToId(EXPLORE_ID)) e.preventDefault();
            }}
            className="group inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-6 text-sm font-semibold text-gray-800 backdrop-blur-md transition-colors hover:border-white/25 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
          >
            Find your use case
            <ArrowDown
              className="h-4 w-4 text-gray-500 transition-[color,transform] duration-200 group-hover:translate-y-0.5 group-hover:text-brand-red-lit"
              strokeWidth={2}
            />
          </a>
        </div>
        <p className="mt-3.5 text-xs text-gray-500">
          Try it right here in your browser. It will ask for your microphone.
        </p>
      </div>

    </div>
  );
}

/** The old chapter's four claims, as a small spec sheet. */
function Proof() {
  return (
    <dl
      style={after(480)}
      className={cn(
        ENTER,
        'hero-proof grid max-w-xl grid-cols-2 self-start overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-md lg:[grid-area:proof]',
      )}
    >
      {PROOF.map(({ icon: Icon, title, detail }) => (
        <div
          key={title}
          className="flex flex-col gap-2 border-white/[0.06] p-3.5 odd:border-r [&:nth-child(-n+2)]:border-b sm:flex-row sm:gap-3 sm:p-4"
        >
          <Icon
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-brand-red-lit"
            strokeWidth={1.75}
          />
          <div>
            <dt className="text-sm font-semibold text-gray-900">{title}</dt>
            <dd className="mt-1 text-xs leading-relaxed text-gray-500">
              {detail}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/*  The example call                                                   */
/* ------------------------------------------------------------------ */

function LiveCall({
  paused,
  onTogglePause,
}: {
  paused: boolean;
  onTogglePause: () => void;
}) {
  const [clock, dispatch] = useReducer(advance, { scene: 0, t: 0 });
  const [reduced, setReduced] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // No ticking for a card nobody can see.
  useEffect(() => {
    const el = card.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) =>
      setOnScreen(entry.isIntersecting),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = !paused && !reduced && onScreen;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      // Capped, so a tab coming back from the background resumes the call
      // where it was instead of skipping ahead.
      dispatch({ type: 'tick', dt: Math.min(now - last, 250) });
      last = now;
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const scene = SCENES[clock.scene];
  const tl = TIMELINES[clock.scene];
  // Reduced motion shows each call finished and still; the tabs switch calls.
  const t = reduced ? tl.settled : clock.t;
  const frame = frameAt(tl, t);
  const progress = Math.min(1, t / tl.total);

  // Picked while still (paused or reduced motion), a call opens finished, so
  // there is something to read rather than a phone frozen mid-ring.
  const pick = (i: number) =>
    dispatch({
      type: 'pick',
      scene: i,
      t: paused || reduced ? TIMELINES[i].settled : 0,
    });

  const TimeIcon = scene.timeIcon;
  const amp =
    frame.orb === 'talking'
      ? 1
      : frame.orb === 'listening'
        ? 0.55
        : frame.ringing
          ? 0.22
          : 0.08;

  return (
    <div
      ref={card}
      className="relative mx-auto w-full max-w-[28rem] lg:mx-0 lg:self-center lg:justify-self-end lg:[grid-area:call]"
    >
      <figure
        className="relative rounded-[1.75rem] animate-in fade-in zoom-in-95 fill-mode-both duration-1000 motion-reduce:animate-none"
        style={{ animationDelay: '250ms' }}
      >
        {/* GlassCard's layers: a blurred ring for the glow, the crisp ring
            with its travelling arc, then the glass. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[3px] rounded-[inherit] opacity-70 blur-[10px]"
        >
          <div className="glow-ring h-full w-full rounded-[inherit] [--ring-w:3px]" />
        </div>
        <div
          aria-hidden="true"
          className="glow-ring pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
        />

        <div className="relative overflow-hidden rounded-[inherit] border border-white/[0.07] bg-[#120a0c]/75 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl md:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />

          <figcaption className="sr-only">
            Example call, {scene.sector.toLowerCase()}: {scene.summary}
          </figcaption>

          {/* The animation itself is hidden from screen readers, which get
              the caption instead of a running commentary. */}
          <div aria-hidden="true">
            {/* Who is calling, and how the call stands. */}
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 shrink-0">
                {frame.ringing && (
                  <>
                    <span className="hero-ring absolute inset-0 rounded-full border border-brand-red-lit/60" />
                    <span className="hero-ring absolute inset-0 rounded-full border border-brand-red-lit/60 [animation-delay:0.8s]" />
                  </>
                )}
                <span className="relative block h-14 w-14 overflow-hidden rounded-full border border-white/10 bg-black/40 shadow-[0_0_30px_-6px_rgba(255,46,67,0.55)]">
                  <Orb
                    colors={['#ff6b78', '#8c1925']}
                    seed={3000}
                    agentState={frame.orb}
                  />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-gray-900">
                  {scene.business}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-500">
                  <TimeIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="tabular-nums">{scene.time}</span>
                  <span className="hidden sm:inline lg:hidden xl:inline">
                    · {frame.ringing ? 'Picking up…' : 'Answered by AI'}
                  </span>
                </p>
              </div>
              <CallStatus frame={frame} />
            </div>

            {/* The voice: tall and red while the agent talks, softer while
                it listens, nearly flat otherwise. */}
            <div
              className={cn(
                'hero-eq mt-5 flex h-10 items-center justify-between transition-colors duration-300',
                frame.orb === 'talking'
                  ? 'text-brand-red-lit'
                  : frame.orb === 'listening'
                    ? 'text-gray-600'
                    : 'text-gray-300',
              )}
              style={{ '--hero-amp': amp } as CSSProperties}
            >
              {BARS.map((style, i) => (
                <span
                  key={i}
                  style={style}
                  className="h-full w-[3px] rounded-full bg-current"
                />
              ))}
            </div>

            {/* The call as a feed, newest at the bottom: the lines, then once
                it ends, what landed in the dashboard. Older entries drift up
                and fade out under the mask. Each line is laid out whole from
                its first word and the words light up as they are said, so
                nothing reflows mid-sentence. */}
            <div className="hero-feed relative mt-4 h-[16rem] overflow-hidden sm:h-[19rem] [mask-image:linear-gradient(to_bottom,transparent,#000_18%)]">
              {frame.ringing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-brand-red-lit/40 bg-maroon-500/25 text-brand-red-lit shadow-[0_0_30px_-6px_rgba(255,46,67,0.7)]">
                    <PhoneIncoming
                      className="h-5 w-5 animate-pulse motion-reduce:animate-none"
                      strokeWidth={1.75}
                    />
                  </span>
                  <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
                    Incoming call
                  </p>
                </div>
              ) : (
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5">
                  {tl.lines.map((line, i) =>
                    frame.spoken[i] > 0 ? (
                      <Bubble
                        key={`${clock.scene}-${i}`}
                        line={line}
                        shown={frame.spoken[i]}
                        caller={scene.caller}
                      />
                    ) : null,
                  )}

                  {frame.ended && (
                    <p className="flex items-center gap-3 pt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-gray-500 animate-in fade-in duration-500 motion-reduce:animate-none">
                      <span className="h-px flex-1 bg-white/[0.08]" />
                      Saved to your dashboard
                      <span className="h-px flex-1 bg-white/[0.08]" />
                    </p>
                  )}
                  {scene.outcomes
                    .slice(0, frame.outcomes)
                    .map(({ icon: Icon, title, detail }) => (
                      <div
                        key={`${clock.scene}-${title}`}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2 animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none"
                      >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success-lit">
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-gray-900">
                            {title}
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {detail}
                          </span>
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Pick a call, or stop the motion. */}
          <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-4">
            <div
              role="group"
              aria-label="Example calls"
              className="flex min-w-0 flex-1 gap-1.5"
            >
              {SCENES.map((s, i) => {
                const active = i === clock.scene;
                const Icon = s.icon;
                return (
                  <button
                    key={s.sector}
                    type="button"
                    onClick={() => pick(i)}
                    aria-pressed={active}
                    aria-label={s.sector}
                    className={cn(
                      'relative flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit',
                      active
                        ? 'border-brand-red-lit/50 bg-maroon-500/30 text-white'
                        : 'border-white/[0.08] bg-white/[0.03] text-gray-500 hover:border-white/20 hover:text-gray-800',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    {/* Icon-only wherever three labels won't fit: a phone,
                        and the narrow card column from 1024 to 1279px. */}
                    <span
                      aria-hidden="true"
                      className="hidden truncate sm:block lg:hidden xl:block"
                    >
                      {s.sector}
                    </span>
                    {active && (
                      // How far through this call the demo is.
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-4 bottom-0 h-[2px] origin-left rounded-full bg-brand-red-lit"
                        style={{ transform: `scaleX(${progress})` }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Nothing moves under reduced motion, so there is nothing to pause. */}
            {!reduced && (
              <button
                type="button"
                onClick={onTogglePause}
                aria-label={paused ? 'Play the animations' : 'Pause the animations'}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-gray-500 transition-colors hover:border-white/20 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
              >
                {paused ? (
                  <Play className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <Pause className="h-4 w-4" strokeWidth={2} />
                )}
              </button>
            )}
          </div>
        </div>
      </figure>
    </div>
  );
}

/** Ringing, live with a running clock, or ended. */
function CallStatus({ frame }: { frame: ReturnType<typeof frameAt> }) {
  const clock = `${String(Math.floor(frame.seconds / 60)).padStart(2, '0')}:${String(frame.seconds % 60).padStart(2, '0')}`;

  if (frame.ringing) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-red-lit/40 bg-maroon-500/30 px-2.5 py-1 text-[11px] font-medium text-white">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-red-lit motion-reduce:animate-none" />
        Ringing
      </span>
    );
  }
  if (frame.ended) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-gray-500">
        Ended <span className="tabular-nums">{clock}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success-lit/30 bg-success/15 px-2.5 py-1 text-[11px] font-medium text-success-lit">
      <span className="h-1.5 w-1.5 rounded-full bg-success-lit shadow-[0_0_8px_hsl(var(--success-lit))]" />
      Live <span className="tabular-nums">{clock}</span>
    </span>
  );
}

/** One line of the call: the agent on the left, the caller on the right. */
function Bubble({
  line,
  shown,
  caller,
}: {
  line: TimedLine;
  shown: number;
  caller: string;
}) {
  const agent = line.who === 'agent';
  return (
    <div
      className={cn(
        'flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none',
        agent ? 'items-start' : 'items-end',
      )}
    >
      <span
        className={cn(
          'mb-1 px-1 text-[10px] font-medium uppercase tracking-[0.2em]',
          agent ? 'text-brand-red-lit/90' : 'text-gray-500',
        )}
      >
        {agent ? 'AI agent' : caller}
      </span>
      <p
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug',
          agent
            ? 'rounded-bl-md border border-white/[0.07] bg-white/[0.06] text-gray-800'
            : 'rounded-br-md border border-brand-red-lit/25 bg-maroon-500/40 text-gray-900',
        )}
      >
        {line.words.map((word, i) => (
          <span
            key={i}
            className={cn(
              'transition-opacity duration-200',
              i < shown ? 'opacity-100' : 'opacity-0',
            )}
          >
            {word}
            {i < line.words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  The ticker                                                         */
/* ------------------------------------------------------------------ */

/**
 * Every kind of business in the use-case explorer, drifting past in a glass
 * band along the bottom of the intro. Hover pauses it; so does the intro's
 * Pause button. Screen readers get one sentence instead of sixty names.
 */
function Ticker() {
  const loop = [...TICKER, ...TICKER];

  return (
    <div className="relative border-y border-white/[0.06] bg-[#0b0406]/55 backdrop-blur-md">
      <p className="sr-only">
        Built for {TICKER.length} kinds of business, from restaurants and
        dental clinics to plumbers and law firms.
      </p>
      <div
        aria-hidden="true"
        className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4 md:px-10"
      >
        <span className="hidden shrink-0 text-[11px] font-medium uppercase tracking-[0.24em] text-gray-500 md:block">
          Built for
        </span>
        <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)]">
          <ul
            className="hero-marquee flex w-max"
            style={
              { '--marquee-duration': `${TICKER.length * 4}s` } as CSSProperties
            }
          >
            {loop.map(({ name, icon: Icon }, i) => (
              <li
                key={i}
                className="flex shrink-0 items-center gap-2 pr-9 text-sm text-gray-600"
              >
                <Icon className="h-4 w-4 text-brand-red-lit/80" strokeWidth={1.75} />
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
