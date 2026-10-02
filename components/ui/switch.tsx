"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

// Maroon when on (with the same red glow the nav links use), the ink input
// colour with a hairline when off.
const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
    size?: "sm" | "default"
  }
>(({ className, size = "default", ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-brand-red-lit/60 data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_12px_rgba(255,46,67,0.4)] data-[state=unchecked]:border-white/[0.12] data-[state=unchecked]:bg-input",
      size === "sm" ? "h-[18px] w-8" : "h-6 w-11",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0.5",
        size === "sm"
          ? "h-3.5 w-3.5 data-[state=checked]:translate-x-[16px]"
          : "h-5 w-5 data-[state=checked]:translate-x-[22px]"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
