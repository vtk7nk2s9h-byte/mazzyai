import type { CSSProperties, ReactNode } from "react";
import styles from "@/app/ui/reflectivediv.module.css";

type Props = {
  children?: ReactNode;
  width?: number | string;
  height?: number | string;
  /** Two gradient colors. Defaults to the brand maroon-to-black ramp. */
  colors?: [string, string];
  /** Space between the box and its reflection, in px */
  gap?: number;
  /** How visible the reflection is (0 to 1) */
  reflectionOpacity?: number;
  radius?: number;
  className?: string;
};

const toCss = (v: number | string) => (typeof v === "number" ? `${v}px` : v);

export default function ReflectiveDiv({
  children,
  width = 200,
  height = 200,
  colors = ["#7b1e2c", "#121013"], // maroon-500 → ink-900
  gap = 10,
  reflectionOpacity = 0.3,
  radius = 20,
  className,
}: Props) {
  const vars = {
    "--w": toCss(width),
    "--h": toCss(height),
    "--c1": colors[0],
    "--c2": colors[1],
    "--gap": `${gap}px`,
    "--reflect": reflectionOpacity,
    "--radius": `${radius}px`,
  } as CSSProperties;

  return (
    <div
      className={[styles.box, className].filter(Boolean).join(" ")}
      style={vars}
    >
      {children}
    </div>
  );
}