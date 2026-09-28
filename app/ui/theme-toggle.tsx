"use client";

import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark"); // for Tailwind's dark: classes
  try {
    localStorage.setItem("theme", theme);
  } catch {}
}

export default function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  // Read the theme the head script already applied (avoids a hydration mismatch)
  useEffect(() => {
    setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    setReady(true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next ? "dark" : "light");
  };

  return (
    <label
      className={[styles.switch, className].filter(Boolean).join(" ")}
      data-ready={ready || undefined}
    >
      <input
        type="checkbox"
        role="switch"
        className={styles.input}
        checked={isDark}
        onChange={toggle}
        aria-label="Dark mode"
      />
      <span className={styles.slider} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </label>
  );
}
