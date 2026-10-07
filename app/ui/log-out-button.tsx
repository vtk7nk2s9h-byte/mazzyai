"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import styles from "@/app/ui/logoutButton.module.css";
import ArrowIcon from "@/components/ui/arrow-icon";

type Stage = "idle" | "walking1" | "walking2" | "falling" | "closing";

// Each stage and how long it lasts (ms)
const SEQUENCE: [Stage, number][] = [
  ["walking1", 350],
  ["walking2", 450],
  ["falling", 700],
  ["closing", 400],
];

type Props = {
  /** The visible text — or, with `iconOnly`, just the accessible name. */
  label?: string;
  /**
   * Drops the label and the arrow so the figure and doorway take the whole
   * button. `label` becomes the aria-label and tooltip, since the text that
   * named the button is gone.
   */
  iconOnly?: boolean;
  /**
   * "dark" = dark button for light pages, "light" = light button for dark
   * pages, "brand" = brand maroon button with a white door and figure,
   * "bar" = unfilled, for the header glass (black label, red door, red hover),
   * "glass" = translucent and blurred, for the sidebar panel,
   * "outline" = unfilled with a maroon hairline, matching the login card's
   * OTP toggle.
   */
  variant?: "dark" | "light" | "brand" | "bar" | "glass" | "outline";
  /**
   * "submit" lets the click submit the surrounding form straight away, so the
   * animation plays over the request instead of delaying it.
   */
  type?: "button" | "submit";
  /**
   * Called the moment the click is accepted, before the animation runs. Use
   * this for navigation so the destination starts loading immediately and the
   * figure finishes walking on its own.
   */
  onStartAction?: () => void;
  /** Called when the animation finishes (e.g. sign the user out here) */
  onLogout?: () => void | Promise<void>;
  /** Reset the button after this many ms. Set to 0 to keep it in the final state. */
  resetAfter?: number;
  /** Blocks the click without removing the button from the tab order. */
  disabled?: boolean;
  className?: string;
};

export default function LogoutButton({
  label = "Log Out",
  iconOnly = false,
  variant = "dark",
  type = "button",
  onStartAction,
  onLogout,
  resetAfter = 1200,
  disabled = false,
  className,
}: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [done, setDone] = useState(false);
  const timers = useRef<number[]>([]);
  // Unique id so multiple buttons on one page don't share a clipPath
  const clipId = `logout-floor-${useId().replace(/:/g, "")}`;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const busy = stage !== "idle" || done;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    // A submit button would still post the form on a repeat click, so block
    // the default rather than just bailing out of the animation.
    if (busy || disabled) {
      e.preventDefault();
      return;
    }

    // Fires before anything else, so a caller that navigates here is not
    // waiting on the ~1.9s sequence.
    onStartAction?.();

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      onLogout?.();
      return;
    }

    let elapsed = 0;
    SEQUENCE.forEach(([s, duration]) => {
      timers.current.push(window.setTimeout(() => setStage(s), elapsed));
      elapsed += duration;
    });

    timers.current.push(
      window.setTimeout(() => {
        setStage("idle");
        setDone(true);
        onLogout?.();
        if (resetAfter > 0) {
          timers.current.push(
            window.setTimeout(() => setDone(false), resetAfter)
          );
        }
      }, elapsed)
    );
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      aria-busy={busy}
      aria-disabled={disabled || undefined}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      data-stage={stage}
      data-done={done || undefined}
      className={[
        styles.button,
        styles[variant],
        iconOnly && styles.iconOnly,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!iconOnly && (
        <>
          <span className={styles.text}>{label}</span>

          <span className={styles.arrow} aria-hidden="true">
            <ArrowIcon />
          </span>
        </>
      )}

      <svg
        className={styles.icon}
        viewBox="0 0 48 32"
        width="48"
        height="32"
        aria-hidden="true"
      >
        <defs>
          {/* Hides the figure once it drops below the doorway floor */}
          <clipPath id={clipId}>
            <rect x="0" y="0" width="48" height="30" />
          </clipPath>
        </defs>

        <rect className={styles.doorway} x="32" y="4" width="12" height="26" rx="1" />

        <g clipPath={`url(#${clipId})`}>
          <g className={styles.figure}>
            <circle cx="24" cy="8" r="2.6" />
            <line x1="24" y1="11" x2="22.5" y2="20" />
            <line className={styles.armA} x1="23.6" y1="13" x2="20" y2="17" />
            <line className={styles.armB} x1="23.6" y1="13" x2="27.5" y2="16" />
            <line className={styles.legA} x1="22.5" y1="20" x2="19.5" y2="28" />
            <line className={styles.legB} x1="22.5" y1="20" x2="26" y2="28" />
          </g>
        </g>

        <g className={styles.door}>
          <rect x="32" y="4" width="12" height="26" rx="1" />
          <circle className={styles.knob} cx="34.8" cy="17" r="1.5" />
        </g>
      </svg>
    </button>
  );
}