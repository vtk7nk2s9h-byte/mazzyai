"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import type { IconType } from "react-icons";
import {
  IoHomeOutline,
  IoBookOutline,
  IoChatbubbleEllipsesOutline,
  IoSettingsOutline,
  IoPersonOutline,
} from "react-icons/io5";
import styles from "@/app/ui/navigation.module.css";

export type NavItem = {
  label: string;
  href: string;
  icon: IconType;
};

const DEFAULT_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: IoHomeOutline },
  { label: "About", href: "/about", icon: IoBookOutline },
  { label: "Contact Us", href: "/contact", icon: IoChatbubbleEllipsesOutline },
  { label: "Settings", href: "/settings", icon: IoSettingsOutline },
  { label: "Profile", href: "/profile", icon: IoPersonOutline },
];

type Props = {
  items?: NavItem[];
  /** Must match the background behind the nav so the "notch" looks cut out. */
  notchColor?: string;
  accentColor?: string;
  barColor?: string;
};

function indexFromPath(items: NavItem[], pathname: string | null) {
  if (!pathname) return 0;
  // Longest matching href wins, so "/about/team" still highlights "/about".
  let best = 0;
  let bestLen = -1;
  items.forEach((item, i) => {
    const match =
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(item.href + "/");
    if (match && item.href.length > bestLen) {
      best = i;
      bestLen = item.href.length;
    }
  });
  return best;
}

export default function NavigationMenu({
  items = DEFAULT_ITEMS,
  notchColor = "#ffffff",
  accentColor = "#7b1e2c",
  barColor = "#121013",
}: Props) {
  const pathname = usePathname();
  const [active, setActive] = useState(() => indexFromPath(items, pathname));

  // Keep in sync with browser back/forward and external navigation.
  useEffect(() => {
    setActive(indexFromPath(items, pathname));
  }, [pathname, items]);

  const vars = {
    "--count": items.length,
    "--active": active,
    "--notch": notchColor,
    "--accent": accentColor,
    "--bar": barColor,
  } as CSSProperties;

  return (
    <nav className={styles.navigation} style={vars} aria-label="Main">
      <ul>
        {items.map(({ label, href, icon: Icon }, i) => (
          <li key={href} className={i === active ? styles.active : undefined}>
            <Link
              href={href}
              onClick={() => setActive(i)}
              aria-current={i === active ? "page" : undefined}
            >
              <span className={styles.icon} aria-hidden="true">
                <Icon />
              </span>
              <span className={styles.text}>{label}</span>
            </Link>
          </li>
        ))}
        <li className={styles.indicator} aria-hidden="true" />
      </ul>
    </nav>
  );
}