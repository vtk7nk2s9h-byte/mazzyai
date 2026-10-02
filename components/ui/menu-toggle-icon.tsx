"use client"

import * as React from "react"

import { cn } from "@/app/lib/utils.ts"

type MenuToggleIconProps = React.ComponentProps<"svg"> & {
  /** Hamburger when false, X when true. */
  open?: boolean
  /** Length of the morph, in ms. */
  duration?: number
}

/**
 * Hamburger that morphs into a close icon. The bars are <rect>s rather than
 * <line>s so `transform-box: fill-box` has a real box to rotate around — a
 * horizontal line has zero height and would rotate around the wrong point.
 */
export function MenuToggleIcon({
  open = false,
  duration = 300,
  className,
  ...props
}: MenuToggleIconProps) {
  const bar: React.CSSProperties = {
    transformBox: "view-box",
    transformOrigin: "center",
    transition: `transform ${duration}ms ease, opacity ${duration}ms ease`,
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-5", className)}
      aria-hidden="true"
      {...props}
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="2"
        rx="1"
        style={{
          ...bar,
          transform: open ? "translateY(6px) rotate(45deg)" : undefined,
        }}
      />
      <rect
        x="3"
        y="11"
        width="18"
        height="2"
        rx="1"
        style={{ ...bar, opacity: open ? 0 : 1 }}
      />
      <rect
        x="3"
        y="17"
        width="18"
        height="2"
        rx="1"
        style={{
          ...bar,
          transform: open ? "translateY(-6px) rotate(-45deg)" : undefined,
        }}
      />
    </svg>
  )
}
