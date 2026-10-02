"use client"

import * as React from "react"

import { cn } from "@/app/lib/utils.ts"

type MaroonDataWiresProps = {
  baseColor?: string
  /** Grid line colour. */
  wireColor?: string
  /** Power streaks and the cursor light. */
  glowColor?: string
  /** 0–2. Line weight and glow strength. */
  intensity?: number
  /** 0.05–3. Resting drift rate. */
  speed?: number
  /** 0.2–2. Grid fineness and streak count. */
  wireDensity?: number
  /** 0–2. How hard scrolling accelerates and brightens the grid. Scroll changes
   *  the speed of the drift, never the grid's position. */
  scrollResponse?: number
  /** 0–2. How strongly the grid lights up around the cursor. */
  pointerResponse?: number
  className?: string
}

const MAX_DPR = 2
const POINTER_RADIUS = 210

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function hexToRgb(color: string) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return "140,20,30"
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1]
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`
}

/**
 * Fixed, full-screen animated background: a fine maroon data grid on black with
 * bright red power streaks running along the lines, a travelling shimmer, and a
 * cursor that lights the grid around it.
 *
 * Scrolling accelerates the drift, the streaks and the shimmer without moving
 * the grid: the field speeds up while you scroll and coasts back to a slow
 * drift when you stop.
 *
 * Renders behind page content (-z-10) and ignores pointer events; the cursor is
 * tracked on window, so it still responds from underneath the content.
 */
export default function MaroonDataWires({
  // Tuned against ScrollGlobe, which is the darkest thing on the page and sets
  // the house style: a vinous near-black ground carrying one vivid red. The
  // ground is the globe's #090203 family; the streaks borrow its limb red
  // outright, so the field reads as black-and-red rather than washed maroon.
  baseColor = "#070203",
  wireColor = "#4a1119",
  glowColor = "#ff2e43",
  // Below 1 because the glow colour is now four times brighter than the old
  // maroon — same perceived energy, far less lift on the black.
  intensity = 0.85,
  speed = 0.3,
  wireDensity = 1,
  scrollResponse = 1,
  pointerResponse = 1,
  className,
}: MaroonDataWiresProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  const settings = React.useRef({
    baseColor,
    wireColor,
    glowColor,
    intensity,
    speed,
    wireDensity,
    scrollResponse,
    pointerResponse,
  })
  settings.current = {
    baseColor,
    wireColor,
    glowColor,
    intensity,
    speed,
    wireDensity,
    scrollResponse,
    pointerResponse,
  }

  React.useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let width = 1
    let height = 1

    // Overlays never change shape between resizes, so they are built once
    // there instead of being reallocated on every frame.
    let vignette: CanvasGradient | null = null
    let glass: CanvasGradient | null = null

    let lastScrollY = window.scrollY
    let velocity = 0
    let pointerX = -9999
    let pointerY = -9999
    let targetX = -9999
    let targetY = -9999
    let pointerOn = 0
    let pointerLit = 0

    let drift = 0
    let streakPhase = 0
    let shimmer = 0
    let lastTime = 0

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    const resize = () => {
      const rect = container.getBoundingClientRect()
      width = Math.max(1, Math.floor(rect.width))
      height = Math.max(1, Math.floor(rect.height))
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.08,
        width / 2,
        height / 2,
        width * 0.8
      )
      vignette.addColorStop(0, "rgba(0,0,0,0)")
      vignette.addColorStop(1, "rgba(0,0,0,0.84)")

      // A warm sheen rather than the white wash this used to be: neutral white
      // at 0.03 was lifting the whole top-left off the black and greying the
      // red, which is what read as "the site is lighter than the globe".
      glass = ctx.createLinearGradient(0, 0, width, height)
      glass.addColorStop(0, "rgba(255,214,220,0.012)")
      glass.addColorStop(0.45, "rgba(0,0,0,0)")
      glass.addColorStop(1, "rgba(0,0,0,0.42)")
    }

    const draw = (dt: number) => {
      const s = settings.current
      const power = clamp(s.intensity, 0, 2)
      const rate = clamp(s.speed, 0.05, 3)
      const density = clamp(s.wireDensity, 0.2, 2)
      const scrollAmount = clamp(s.scrollResponse, 0, 2)
      const wire = hexToRgb(s.wireColor)
      const glow = hexToRgb(s.glowColor)

      // Sampled in the frame, not from a scroll event — scroll events do not
      // fire in lockstep with rAF, so driving motion from them lurches.
      const scrollY = window.scrollY
      const moved = Math.abs(scrollY - lastScrollY)
      lastScrollY = scrollY

      // px/sec, so response does not change with refresh rate.
      const target = dt > 0 ? clamp(moved / dt / 3200, 0, 1) : 0
      const k = dt > 0 ? 1 - Math.pow(0.86, dt * 60) : 0
      velocity += (target - velocity) * (target > velocity ? k * 3 : k)
      pointerLit += (pointerOn - pointerLit) * k
      pointerX += (targetX - pointerX) * k * 2
      pointerY += (targetY - pointerY) * k * 2

      const surge = velocity * scrollAmount
      const lit = pointerLit * clamp(s.pointerResponse, 0, 2)

      // Restrained surge: the scroll response stays legible without the field
      // tearing across the screen.
      drift += dt * rate * (1 + surge * 1.8)
      streakPhase += dt * rate * (1 + surge * 2.2)
      shimmer += dt * rate * (1 + surge * 0.8)

      const step = Math.max(12, Math.round(22 / density))
      // Position is driven only by `drift`, which advances on its own clock.
      // Scrolling changes how fast that clock runs, never where the grid sits:
      // tying offsets to scrollY meant the fixed canvas was repositioning its
      // contents on the same frames the page was scrolling, which is what read
      // as judder.
      const offX = ((drift * 5) % step) - step
      const offY = ((drift * 7) % step) - step

      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = s.baseColor
      ctx.fillRect(0, 0, width, height)

      // Grid: one path per axis. Previously every line was its own
      // beginPath/stroke — ~137 draw calls a frame at desktop width, which is
      // what blew the budget while scrolling.
      ctx.beginPath()
      for (let x = offX; x <= width + step; x += step) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      }
      for (let y = offY; y <= height + step; y += step) {
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
      }
      ctx.lineWidth = 1
      ctx.strokeStyle = `rgba(${wire},${0.045 + power * 0.035 + surge * 0.03})`
      ctx.stroke()

      ctx.globalCompositeOperation = "lighter"

      // Shimmer: a soft diagonal band sweeping the whole grid. One gradient a
      // frame replaces per-line alpha maths and reads stronger.
      const sweep = ((shimmer * 0.16) % 1.6) - 0.3
      const band = ctx.createLinearGradient(0, 0, width, height)
      band.addColorStop(clamp(sweep - 0.22, 0, 1), "rgba(0,0,0,0)")
      band.addColorStop(
        clamp(sweep, 0, 1),
        `rgba(${wire},${0.05 + power * 0.035})`
      )
      band.addColorStop(clamp(sweep + 0.22, 0, 1), "rgba(0,0,0,0)")
      ctx.fillStyle = band
      ctx.fillRect(0, 0, width, height)

      // Streaks. No shadowBlur anywhere: a wide dim pass under a thin bright
      // one gives the same bloom additively, and a gaussian blur per stroke was
      // the single most expensive thing in the old frame.
      const streaks = Math.round(7 + 9 * density)
      // Length still stretches with the surge, but modestly. This is the one
      // scroll-time term that actually costs fill: longer strokes mean more
      // pixels shaded every frame, on top of a main thread already busy with
      // the scroll itself.
      const len = Math.max(90, step * (9 + power * 3)) * (1 + surge * 0.8)
      // Pulled down from 0.3/0.18 alongside the colour swap: these composite
      // with "lighter", so a vivid red at the old alpha would add far more
      // luminance to the ground than the maroon it replaced.
      const alpha = 0.2 + power * 0.14 + surge * 0.18

      for (let i = 0; i < streaks; i++) {
        const vertical = i % 2 === 0
        const span = (vertical ? height : width) + len
        const travel = ((streakPhase * (60 + i * 11) + i * 397) % span) - len
        const lanes = Math.round((vertical ? width : height) / step) + 2
        // Locked to a grid line by index and carried by the same offset the
        // grid uses, so it rides the line instead of snapping between cells.
        const lane =
          (vertical ? offX : offY) + (((i * 7919) % lanes) + 1) * step

        const x1 = vertical ? lane : travel
        const y1 = vertical ? travel : lane
        const x2 = vertical ? lane : travel + len
        const y2 = vertical ? travel + len : lane

        for (let pass = 0; pass < 2; pass++) {
          const a = pass === 0 ? alpha * 0.16 : alpha
          const g = ctx.createLinearGradient(x1, y1, x2, y2)
          g.addColorStop(0, `rgba(${glow},0)`)
          g.addColorStop(0.5, `rgba(${glow},${a})`)
          g.addColorStop(1, `rgba(${glow},0)`)
          ctx.strokeStyle = g
          ctx.lineWidth = pass === 0 ? 9 + power * 6 : 1.5 + power
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      }

      // Cursor: a crosshair on the nearest lines, lit intersections around it,
      // and a soft bloom. Bounded work — only the cells inside the radius.
      if (lit > 0.01) {
        // Crosshair rides the live grid, so it stays on an actual line.
        const cx = Math.round((pointerX - offX) / step) * step + offX
        const cy = Math.round((pointerY - offY) / step) * step + offY

        ctx.strokeStyle = `rgba(${glow},${0.16 * lit})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx, 0)
        ctx.lineTo(cx, height)
        ctx.moveTo(0, cy)
        ctx.lineTo(width, cy)
        ctx.stroke()

        // Dots sit on a lattice fixed to the viewport, not on the drifting
        // grid — they stay put while the lines run past them.
        const dotX = Math.round(pointerX / step) * step
        const dotY = Math.round(pointerY / step) * step

        const reach = Math.ceil(POINTER_RADIUS / step)
        for (let i = -reach; i <= reach; i++) {
          for (let j = -reach; j <= reach; j++) {
            const x = dotX + i * step
            const y = dotY + j * step
            const d = Math.hypot(x - pointerX, y - pointerY) / POINTER_RADIUS
            if (d >= 1) continue
            const f = (1 - d) * (1 - d) * lit
            const r = 1 + f * 2.6
            ctx.fillStyle = `rgba(${glow},${f * 0.85})`
            ctx.fillRect(x - r, y - r, r * 2, r * 2)
          }
        }

        const bloom = ctx.createRadialGradient(
          pointerX,
          pointerY,
          0,
          pointerX,
          pointerY,
          POINTER_RADIUS
        )
        bloom.addColorStop(0, `rgba(255,238,240,${0.1 * lit})`)
        bloom.addColorStop(0.35, `rgba(${glow},${0.12 * lit})`)
        bloom.addColorStop(1, "rgba(0,0,0,0)")
        ctx.fillStyle = bloom
        ctx.fillRect(
          pointerX - POINTER_RADIUS,
          pointerY - POINTER_RADIUS,
          POINTER_RADIUS * 2,
          POINTER_RADIUS * 2
        )
      }

      ctx.globalCompositeOperation = "source-over"
      if (vignette) {
        ctx.fillStyle = vignette
        ctx.fillRect(0, 0, width, height)
      }
      if (glass) {
        ctx.fillStyle = glass
        ctx.fillRect(0, 0, width, height)
      }
    }

    const loop = (ts: number) => {
      const now = ts * 0.001
      // Clamped so returning from a background tab does not jump every phase
      // forward by however long the tab was hidden.
      const dt = lastTime ? clamp(now - lastTime, 0, 0.05) : 0.016
      lastTime = now
      draw(dt)
      raf = requestAnimationFrame(loop)
    }

    const start = () => {
      if (!raf && !reduceMotion && !document.hidden) {
        lastTime = 0
        raf = requestAnimationFrame(loop)
      }
    }

    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return
      if (!pointerOn) {
        pointerX = e.clientX
        pointerY = e.clientY
      }
      targetX = e.clientX
      targetY = e.clientY
      pointerOn = 1
    }

    const onLeave = () => {
      pointerOn = 0
    }

    const onVisibility = () => (document.hidden ? stop() : start())

    resize()
    draw(0)

    const ro = new ResizeObserver(() => {
      resize()
      draw(0)
    })
    ro.observe(container)

    window.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerleave", onLeave)
    window.addEventListener("blur", onLeave)
    document.addEventListener("visibilitychange", onVisibility)
    start()

    return () => {
      stop()
      ro.disconnect()
      window.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("blur", onLeave)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className
      )}
      style={{ background: baseColor }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
