'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Mic, MicOff, PhoneCall, PhoneOff } from 'lucide-react';
import type {
  LiveCallUtterance,
  SessionStatus,
  WebCallSession,
} from 'retell-client-js-sdk';

import { cn } from '@/lib/utils';

// A Retell *public* key (public_key_...), not an API key. It is domain-locked
// in the Retell dashboard and may only open web calls, which is why it is safe
// to ship in the bundle — the secret RETELL_API_KEY never leaves the server.
// Add localhost to the key's allowed domains to test this locally.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_RETELL_PUBLIC_KEY;
const AGENT_ID = process.env.NEXT_PUBLIC_RETELL_AGENT_ID;

// Only needed when the Retell public key has Abuse Prevention turned on.
// The matching *secret* key belongs in the Retell dashboard, not here —
// Retell verifies the token and scores it server-side.
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

// Module-scoped so the <script> is injected once per page, not once per call.
let recaptchaLoader: Promise<void> | null = null;

function loadRecaptcha(siteKey: string): Promise<void> {
  if (window.grecaptcha) return Promise.resolve();
  recaptchaLoader ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Clear the cache so a later attempt can retry rather than reusing a
      // promise that will never resolve.
      recaptchaLoader = null;
      reject(new Error('Could not load reCAPTCHA.'));
    };
    document.head.appendChild(script);
  });
  return recaptchaLoader;
}

/**
 * v3 tokens are single-use and short-lived, so this runs per call attempt
 * rather than once on mount.
 */
async function getRecaptchaToken(siteKey: string): Promise<string> {
  await loadRecaptcha(siteKey);
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) throw new Error('reCAPTCHA did not initialise.');
  await new Promise<void>((resolve) => grecaptcha.ready(resolve));
  return grecaptcha.execute(siteKey, { action: 'retell_web_call' });
}

type Line = { id: string; role: 'agent' | 'user'; content: string };

/**
 * The live transcript is a union covering tool calls, DTMF digits, node
 * transitions and more — none of which a visitor should see. Keep the two
 * spoken roles and drop the rest.
 */
function toLines(utterances: LiveCallUtterance[]): Line[] {
  return utterances.flatMap((u) =>
    (u.role === 'agent' || u.role === 'user') && u.content
      ? [{ id: u.id, role: u.role, content: u.content }]
      : [],
  );
}

/**
 * Dynamic variables are interpolated into the agent's prompt before the call
 * starts, so a visitor typing into these fields is writing into the prompt.
 * Strip the characters that could open a placeholder or a new instruction
 * line, and cap the length — a name is a name, not a paragraph.
 */
function sanitize(value: FormDataEntryValue | null, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n{}]/g, ' ').trim().slice(0, maxLength);
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  connecting: 'Connecting…',
  live: 'Listening',
  monitoring: 'Listening',
  listening: 'Listening',
  taken_over: 'Handed to a human',
  ended: 'Call ended',
};

export default function VoiceAgentWidget() {
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The session is imperative and must survive re-renders without causing
  // them, so it lives in a ref rather than in state.
  const sessionRef = useRef<WebCallSession | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const active = status !== null && status !== 'ended';

  const endCall = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setMuted(false);
    // Already gone is a fine outcome — the agent may have hung up first.
    await session?.end().catch(() => {});
  }, []);

  // A live microphone must not outlive the page.
  useEffect(() => () => void sessionRef.current?.end().catch(() => {}), []);

  // Pin the transcript to the newest line.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const startCall = useCallback(async (caller: { name: string; email: string }) => {
    if (sessionRef.current) return;
    setError(null);
    setLines([]);
    setStatus('connecting');

    try {
      // Imported here rather than at module scope: the SDK carries its own
      // WebRTC transport, and no visitor should download it to read the page.
      const { RetellClient } = await import('retell-client-js-sdk');

      const recaptchaToken = RECAPTCHA_SITE_KEY
        ? await getRecaptchaToken(RECAPTCHA_SITE_KEY)
        : undefined;

      const session = new RetellClient({ key: PUBLIC_KEY! }).createWebCall({
        agent_id: AGENT_ID!,
        transcript: true,
        // Substituted into {{caller_name}} / {{caller_email}} in the agent's
        // prompt and opening line. Send both keys every time, blank or not:
        // a placeholder with nothing behind it is the agent's problem, and a
        // fallback is cheaper than finding out how it handles one.
        //
        // Visitor-typed and unverified — the widget speaks to Retell with the
        // domain-locked public key, so anyone can put anything here. Good
        // enough to greet someone by name; not an identity, and not a
        // confirmed address.
        retell_llm_dynamic_variables: {
          caller_name: caller.name || 'there',
          caller_email: caller.email || 'not provided',
        },
        ...(recaptchaToken ? { recaptchaToken } : {}),
        hooks: {
          onStatus: setStatus,
          onTranscript: (utterances) => setLines(toLines(utterances)),
          onEnd: () => {
            sessionRef.current = null;
            setMuted(false);
          },
          onError: (err) => {
            sessionRef.current = null;
            setStatus(null);
            setError(err.message);
          },
        },
      });

      sessionRef.current = session;
      await session.ready;
    } catch (err) {
      sessionRef.current = null;
      setStatus(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not start the call. Check your microphone permission.',
      );
    }
  }, []);

  // The fields are uncontrolled: the values are only ever read here, so state
  // per keystroke would buy nothing.
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      void startCall({
        name: sanitize(fields.get('caller_name'), 80),
        email: sanitize(fields.get('caller_email'), 120),
      });
    },
    [startCall],
  );

  const toggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    setMuted((wasMuted) => {
      if (wasMuted) session.unmute();
      else session.mute();
      return !wasMuted;
    });
  }, []);

  // Misconfiguration is a deploy-time mistake, not something a visitor should
  // see a broken button for.
  if (!PUBLIC_KEY || !AGENT_ID) return null;

  return (
    // <details> carries the open/closed state, the keyboard handling and the
    // aria-expanded wiring itself — none of that needs React. The element
    // keeps its default display: a flex/grid <details> hides its closed
    // content inconsistently across browsers, so the panel is positioned
    // against it instead, which is why it can sit above the summary despite
    // following it in the DOM.
    <details
      className="group fixed bottom-6 right-6 z-50"
      onToggle={(e) => {
        if (!e.currentTarget.open) void endCall();
      }}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-2.5 rounded-full border border-white/10',
          'bg-ink-800/80 py-3 pl-4 pr-5 text-sm font-medium text-gray-900',
          'shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl',
          'transition-colors hover:border-maroon-400/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400',
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <span
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-full bg-maroon-500 text-white',
            active && 'animate-pulse',
          )}
        >
          <PhoneCall className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="group-open:hidden">Talk to us</span>
        <span className="hidden group-open:inline">Close</span>
      </summary>

      <div className="absolute bottom-full right-0 mb-3 w-[min(22rem,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035] shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div>
            <p className="text-sm font-semibold tracking-tight text-gray-900">
              Voice assistant
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {error ?? (status ? STATUS_LABEL[status] : 'Ready when you are')}
            </p>
          </div>
          {status === 'connecting' ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          ) : null}
        </div>

        {/* A real <form>, so Enter in either field starts the call and the
            browser handles the email format check itself. */}
        <form onSubmit={handleSubmit}>
          {lines.length > 0 ? (
            <div
              ref={transcriptRef}
              aria-live="polite"
              className="max-h-56 space-y-3 overflow-y-auto px-5 py-4"
            >
              {lines.map((line) => (
                <p
                  key={line.id}
                  className={cn(
                    'text-sm leading-relaxed',
                    line.role === 'agent'
                      ? 'text-gray-600'
                      : 'text-right text-gray-900',
                  )}
                >
                  {line.content}
                </p>
              ))}
            </div>
          ) : (
            <p className="px-5 pb-4 pt-6 text-sm leading-relaxed text-gray-500">
              Ask about the product, pricing, or getting set up. Your browser will
              ask for microphone access.
            </p>
          )}

          {/* Kept mounted through the call rather than unmounted — the values
              survive, so ending and calling again does not mean retyping. */}
          <div className={cn('gap-2 px-5 pb-4', active ? 'hidden' : 'grid')}>
            <label htmlFor="retell-caller-name" className="sr-only">
              Your name
            </label>
            <input
              id="retell-caller-name"
              name="caller_name"
              type="text"
              maxLength={80}
              autoComplete="name"
              placeholder="Your name"
              className="h-10 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
            />
            <label htmlFor="retell-caller-email" className="sr-only">
              Your email
            </label>
            <input
              id="retell-caller-email"
              name="caller_email"
              type="email"
              maxLength={120}
              autoComplete="email"
              placeholder="Your email"
              className="h-10 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
            />
            <p className="text-[11px] leading-snug text-gray-400">
              Optional — both just let Jaroen know who he is talking to.
            </p>
          </div>

          <div className="flex gap-2 border-t border-white/[0.07] px-5 py-4">
            {active ? (
              <>
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-pressed={muted}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-gray-600 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
                >
                  {muted ? (
                    <MicOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Mic className="h-4 w-4" strokeWidth={1.75} />
                  )}
                  <span className="sr-only">
                    {muted ? 'Unmute microphone' : 'Mute microphone'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void endCall()}
                  className="inline-flex h-10 grow items-center justify-center gap-2 rounded-xl bg-maroon-500 text-sm font-medium text-white transition-colors hover:bg-maroon-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
                >
                  <PhoneOff className="h-4 w-4" strokeWidth={1.75} />
                  End call
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="inline-flex h-10 grow items-center justify-center gap-2 rounded-xl bg-maroon-500 text-sm font-medium text-white transition-colors hover:bg-maroon-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
              >
                <PhoneCall className="h-4 w-4" strokeWidth={1.75} />
                {status === 'ended' ? 'Call again' : 'Start call'}
              </button>
            )}
          </div>
        </form>

        {/* Required wherever the reCAPTCHA badge is hidden. */}
        {RECAPTCHA_SITE_KEY ? (
          <p className="border-t border-white/[0.07] px-5 py-3 text-[11px] leading-snug text-gray-400">
            Protected by reCAPTCHA — Google{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-gray-600"
            >
              Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-gray-600"
            >
              Terms
            </a>{' '}
            apply.
          </p>
        ) : null}
      </div>
    </details>
  );
}
