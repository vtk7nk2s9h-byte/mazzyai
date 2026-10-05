# Glow colours

A reference for glowing colours on this site's near-black wine ground
(`#090203`). Two palettes: gold (an accent, not yet in the project) and red
(the brand, already in use).

---

## Gold

Warm gold shades, from darkest to brightest.

| Name | Hex | Closest Tailwind | Use |
|---|---|---|---|
| Deep gold | `#b8860b` | `yellow-700` | Rims, borders, shadow side |
| Old gold | `#c9a227` | between `yellow-600` and `amber-500` | Fills, icons |
| Classic gold | `#d4af37` | none | The "metallic gold" look |
| Honey | `#f5b82e` | `amber-400` (`#fbbf24`) | Lit text |
| Bright gold | `#ffd34d` | `yellow-300` (`#fde047`) | Highlights, the brightest part of the glow |
| Champagne | `#f7e7b4` | `amber-100` (`#fef3c7`) | Specular shine, a sheen on top |

### Opacity

Tailwind's own colours take an opacity directly. Custom hex values need square
brackets around the hex.

```html
<!-- Tailwind colours -->
<div class="bg-amber-400/10 border border-amber-400/40 text-amber-300">

<!-- Custom hex values -->
<div class="bg-[#d4af37]/15 border-[#d4af37]/50 text-[#ffd34d]">
```

### Glows

```html
<!-- Glowing text -->
<span class="text-[#ffd34d] [text-shadow:0_0_14px_rgba(255,211,77,0.6)]">Gold</span>

<!-- Glowing box -->
<div class="shadow-[0_0_24px_-4px_rgba(245,184,46,0.55)]">…</div>

<!-- Glowing icon -->
<Icon class="text-amber-300 [filter:drop-shadow(0_0_8px_rgba(255,211,77,0.65))]" />

<!-- Metallic gradient text -->
<span class="bg-gradient-to-r from-[#b8860b] via-[#ffd34d] to-[#d4af37] bg-clip-text text-transparent">Premium</span>
```

### Tips

- **A real glow** pairs a bright centre with a dimmer, wider halo. For example,
  text in `#ffd34d` with a shadow of `rgba(245,184,46,0.5)`.
- **Amber vs yellow:** amber leans orange and reads warmer and richer. Yellow
  leans green and can look cheap at full strength.
- **Next to the brand red:** keep gold for accents only, such as a "premium"
  badge or a highlight. Gold and red at equal strength fight each other.

---

## Red (the brand)

Only colours already defined in `tailwind.config.ts` or already used in the
code.

### Tokens

All of these accept `/[n]` opacity.

| Name | Class | Hex | Use |
|---|---|---|---|
| Deepest wine | `maroon-900` | `#20070b` | Dark fills behind glows |
| Dark maroon | `maroon-700` | `#4a1119` | Pressed and active fills |
| Maroon | `maroon-500` | `#7b1e2c` | Primary fill (`bg-maroon-500/30` on buttons) |
| Lifted maroon | `maroon-400` | `#9c2739` | Hover fills, focus rings |
| System red | `brand-red` | `#8c1925` | Borders, rules, the dim half of a glow |
| Lit red | `brand-red-lit` | `#ff2e43` | Text, icons and edges that must glow on black |

### Lighter reds used as hex

No tokens for these.

| Name | Hex | Where it's used |
|---|---|---|
| Soft red | `#ff6b78` | Card icons, the orb's light colour |
| Pink red | `#ff8a95` | Taglines, hover text |
| Pale highlight | `#ffd9dd` | The bright tip of the `.glow-ring` arc |

### Opacity

```html
<div class="bg-maroon-500/30 border border-brand-red-lit/50 text-white">
<div class="bg-brand-red-lit/[0.09] border-brand-red-lit/25">
<span class="text-[#ff8a95]">
```

### Glows

Each of these is already in the code.

```html
<!-- Glowing text (heading first letter) -->
<span class="text-brand-red-lit [text-shadow:0_0_22px_rgba(255,46,67,0.5)]">

<!-- Hover glow (sidebar links) -->
<p class="hover:text-brand-red-lit hover:[text-shadow:0_0_12px_rgba(255,46,67,0.55)]">

<!-- Glowing box (Talk to our agent button) -->
<button class="shadow-[0_14px_40px_-12px_rgba(255,46,67,0.75)]">

<!-- Glowing dot (bullets, live dots) -->
<span class="bg-brand-red-lit shadow-[0_0_10px_rgba(255,46,67,0.9)]">

<!-- Glowing icon -->
<Icon class="text-brand-red-lit [filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))]" />

<!-- Lit rule (section heading underline) -->
<span class="bg-gradient-to-r from-transparent via-brand-red to-transparent shadow-[0_5px_14px_-6px_rgba(140,25,37,0.95)]">

<!-- Gradient text (the intro's "answered.") -->
<span class="bg-gradient-to-r from-[#ff2e43] via-[#ff5b6b] to-[#ff9aa5] bg-clip-text text-transparent">
```

### Which colour does which job

- **Glows:** `rgba(255,46,67,…)` is `brand-red-lit` as a glow colour. Use it
  for halos around bright things.
- **Dim glows:** `rgba(140,25,37,…)` is `brand-red`. Use it under rules and
  edges.
- **Text on black:** use `brand-red-lit`, `#ff6b78` or `#ff8a95`. Don't use
  `brand-red` or `maroon-500` as text, because they go muddy on this
  background (`tailwind.config.ts` says so).
- **Fills:** use `maroon-500` or `brand-red`. Put white text on them.
