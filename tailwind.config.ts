import type { Config } from 'tailwindcss';
// Imports rather than require(): package.json is "type": "module" since
// `prisma orm init`, so CommonJS calls are no longer safe in this file.
import forms from '@tailwindcss/forms';
import animate from 'tailwindcss-animate';

const config: Config = {
  // The toggle puts a .dark class on <html>; without this, dark: utilities
  // would follow the OS setting instead and ignore the switch.
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
      keyframes: {
        // Specular sweep travelling along a section heading's underline.
        'rule-shine': {
          '0%': { transform: 'translateX(-120%)' },
          '55%, 100%': { transform: 'translateX(420%)' },
        },
        'm-pulse': {
          '0%, 100%': {
            transform: 'scale(1)',
            textShadow: '0 0 0 rgba(255, 77, 90, 0)',
          },
          '50%': {
            transform: 'scale(1.22)',
            textShadow: '0 0 18px rgba(255, 77, 90, 0.6)',
          },
        },
      },
      animation: {
        'm-pulse': 'm-pulse 2.4s ease-in-out infinite',
        'rule-shine': 'rule-shine 3.6s ease-in-out infinite',
      },
      colors: {
        // shadcn/ui semantic tokens, backed by the CSS variables in global.css.
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          // Text-on-black value; DEFAULT is the fill and goes muddy as type.
          lit: 'hsl(var(--destructive-lit))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          lit: 'hsl(var(--success-lit))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
          foreground: 'hsl(var(--error-foreground))',
          lit: 'hsl(var(--error-lit))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // The system red: the wordmark letters and every header hover state.
        // The planet's limb red — the globe derives it as #ff2e43 x 0.55.
        'brand-red': '#8c1925',
        // The globe's limb red itself, undimmed. The lit end of the pair: use
        // it where red has to carry on black (a heading's first letter, a card
        // icon, a streak), where #8c1925 would go muddy.
        'brand-red-lit': '#ff2e43',
        // Brand accent. 500 is the primary; 400 lightens for hover, 600 for
        // pressed/active. Matches the --accent of the navigation menu.
        maroon: {
          50: '#fbf4f5',
          100: '#f6e6e9',
          200: '#ecccd3',
          300: '#cf8e9c',
          400: '#9c2739',
          500: '#7b1e2c',
          600: '#5e1622',
          700: '#4a1119',
          800: '#350c12',
          900: '#20070b',
        },
        // Near-black surfaces. 900 matches the --bar of the navigation menu.
        // Wine-tinted rather than neutral, and the dark end is pulled down to
        // the globe's ground so a bar or panel doesn't float above the page.
        ink: {
          50: '#f6f4f5',
          100: '#e9e6e7',
          200: '#d0c9cb',
          300: '#a99fa2',
          400: '#73676a',
          500: '#4c4043',
          600: '#33272b',
          700: '#1f1418',
          800: '#140a0d',
          900: '#0b0406',
        },
        // Dark-first neutrals, warmed toward the brand hue. The ramp is
        // inverted relative to Tailwind's: low numbers are near-black surfaces,
        // high numbers are near-white text. That flips every existing
        // bg-gray-50 panel dark and its text-gray-900 copy light at once,
        // without touching the call sites. The middle of the ramp is lifted
        // rather than mirrored, so text-gray-400/500 stay readable on black.
        gray: {
          // Elevation ladder. The page ground is #090203, so 50 sits above it
          // rather than matching it — panels have to read as raised surfaces,
          // not holes. Each step warms slightly, as a surface closer to the
          // key light would.
          //
          // The whole ramp carries the brand's hue now. Neutral greys on a
          // wine-black ground read as a separate, lighter material, which is
          // what made panels look pasted onto the page instead of lit by it.
          50: '#120a0c', //  panel on page
          100: '#1a1012', //  card on panel
          200: '#291619', //  border / divider
          300: '#4a3338', //  dim + disabled text
          400: '#7d666b', //  tertiary text
          500: '#a08f93', //  muted body text
          600: '#bdaeb1', //  secondary text
          700: '#d6cbcd',
          800: '#eae3e4',
          900: '#f7f2f3', //  primary text
          950: '#fcfafa',
        },
      },
    },
    keyframes: {
      shimmer: {
        '100%': {
          transform: 'translateX(100%)',
        },
      },
    },
  },
  plugins: [forms, animate],
};
export default config;
