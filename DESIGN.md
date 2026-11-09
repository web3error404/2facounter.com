---
version: alpha
name: kiwi-deli
description: "A neighborhood-deli visual system on a vibrant kiwi-orange canvas (#E87A35). Cream butcher-paper surfaces (#F4EBE1), thick dark cocoa borders (2–4px, #2A1F1A), and hard offset shadows cast down-right make every element a physical object on the counter. Kiwi-green (#6CA632) is the single action color. Rubik signs headlines, nav and buttons and carries body copy, JetBrains Mono stamps labels and metadata, Rubik Black sets numerals."

colors:
  primary: "#6ca632"
  on-primary: "#2a1f1a"
  primary-hover: "#7cb53e"
  primary-active: "#5d9229"
  canvas: "#e87a35"
  canvas-soft: "#dcd3c8"
  cream: "#f4ebe1"
  surface: "#ffffff"
  ink: "#2a1f1a"
  muted: "#888888"
  muted-soft: "#a3937f"
  hairline: "#dcd3c8"
  hairline-strong: "#b9ab98"
  accent-red: "#d32f2f"
  accent-blue: "#1e3a8a"
  negative-bg: "#5c1512"

typography:
  hero-display: { fontFamily: "Rubik", fontSize: 52px, fontWeight: 800, lineHeight: 1.1 }
  section-display: { fontFamily: "Rubik", fontSize: 38px, fontWeight: 800, lineHeight: 1.2 }
  body: { fontFamily: "Rubik", fontSize: 16px, fontWeight: 500, lineHeight: 1.5 }
  label: { fontFamily: "JetBrains Mono", fontSize: 13.6px, lineHeight: 1.4 }
  navigation: { fontFamily: "Rubik", fontSize: 16px, fontWeight: 600, lineHeight: 1.1 }
  button: { fontFamily: "Rubik", fontSize: 20px, fontWeight: 700, lineHeight: 1.2 }
  price: { fontFamily: "Rubik", fontSize: 32px, fontWeight: 900, lineHeight: 1, letterSpacing: -0.03125em }
  caption: { fontFamily: "Rubik", fontSize: 11px, fontWeight: 600, lineHeight: 1.6 }

rounded: { xs: 2px, sm: 8px, md: 12px, lg: 16px, xl: 20px, pill: 9999px }

shadows:
  btn: "4px 4px 0 0 rgb(42 31 26 / 0.2)"
  card: "6px 6px 0 0 rgb(0 0 0 / 0.2)"
  ticket: "0 10px 12px rgb(42 31 26 / 0.15), inset 0 2px 0 0 rgb(255 255 255 / 0.65)"

components:
  button-primary: { backgroundColor: "{colors.primary}", textColor: "{colors.on-primary}", border: "4px solid {colors.ink}", shadow: "{shadows.btn}", rounded: "{rounded.md}" }
  button-secondary: { backgroundColor: "{colors.cream}", textColor: "{colors.ink}", border: "3px solid {colors.ink}", shadow: "{shadows.btn}", rounded: "{rounded.md}" }
  card-cream: { backgroundColor: "{colors.cream}", border: "2px solid {colors.ink}", shadow: "{shadows.card}", rounded: "{rounded.xl}" }
  nutrition-panel: { backgroundColor: "{colors.surface}", border: "2px solid {colors.ink}", rounded: "{rounded.xs}" }
  ticket: { backgroundColor: "{colors.cream}", border: "2px solid {colors.ink}", rounded: "0 (perforated top)", shadow: "{shadows.ticket}" }
  badge-stamp: { backgroundColor: "{colors.surface}", border: "2px solid {colors.accent-blue}", textColor: "{colors.accent-blue}", rounded: "{rounded.xs}", tilt: "-2deg" }
  nav-pill: { backgroundColor: "{colors.surface}", border: "2px solid {colors.ink}", rounded: "{rounded.pill}", activeBackgroundColor: "{colors.primary}" }
  top-nav: { backgroundColor: "{colors.cream}", borderBottom: "3px solid {colors.ink}", height: 64px }
  footer: { backgroundColor: "{colors.ink}", textColor: "{colors.cream}", decoration: "barcode mark" }
---
<!-- MIT licensed. Copyright and license: https://opendesignmd.com/licenses/ -->

# How 2facounter.com is designed

## Overview

2FA COUNTER is presented through the visual metaphor of a neighborhood deli. Every page surface is a physical artifact: the generator is a cream order pad, the token chamber is a nutrition-facts-style white panel, countdown timers are tilted blue date stamps, and guide lists read as menu boards with prices. Thick dark borders, hard offset shadows, and dashed perforation lines reinforce the handmade, slightly retro deli aesthetic.

The visual identity centers on four materials: a vibrant **kiwi-orange** canvas (#E87A35) that dominates the page, **kiwi-green** (#6CA632) reserved for primary actions, warm **cream** (#F4EBE1) for paper surfaces, and dark cocoa **ink** (#2A1F1A) for text, borders, and shadows. Typography pairs the geometric grotesque **Rubik** — headings, nav and buttons heavy (700–900), body medium (500) — while **JetBrains Mono** handles technical labels and metadata, and **Rubik Black** sets numerals (prices, stats, digits) with typewriter precision. All fonts are bundled locally at build time via Fontsource — the site makes zero third-party requests.

## Colors

| token | hex | use |
|---|---|---|
| kiwi-orange | #E87A35 | Primary page background, dominant canvas |
| kiwi-green | #6CA632 | Primary actions, active pills, CTA buttons |
| kiwi-cream | #F4EBE1 | Paper surfaces, ticket cards, menu boards |
| kiwi-dark | #2A1F1A | Primary text, borders, shadows, header bars |
| kiwi-muted | #888888 | Secondary metadata, dates, tags |
| kiwi-surface | #FFFFFF | Clean panels, nutrition-facts background |
| kiwi-accent-red | #D32F2F | Ticket numbers, emphasis, decorative stamps |
| kiwi-accent-blue | #1E3A8A | Date stamps, secondary accents |
| kiwi-warm-gray | #DCD3C8 | Subtle dividers, inactive states |

**Contrast note (deviation from the reference spec):** the source spec claims white-on-green meets 4.5:1; it actually measures ≈2.9:1. This implementation uses **kiwi-dark text on kiwi-green** (≈5.4:1) for all buttons and filled green elements. Orange is never used as a text color.

## Typography

| token | family | size | weight | use |
|---|---|---:|---:|---|
| hero-display | Rubik | 3.25rem | 800 | Profile name, major headlines |
| section-display | Rubik | 2.375rem | 800 | Section headers |
| body | Rubik | 1rem | 500 | Paragraphs, descriptions |
| label | JetBrains Mono | 0.85rem | 400–700 | Metadata, tags, captions |
| navigation | Rubik | 1rem | 600 | Nav pills, menu items |
| button | Rubik | 1.25rem | 700 | CTA buttons |
| price | Rubik | 2rem | 900, −0.03125em tracking | Menu prices, big numerals |
| caption | Rubik | 0.6875rem | 600 | Fine print, footnotes |

## Layout, depth & motif

- **Borders:** every significant element carries a visible ink border — 2px minimum, 3px nav, 4px hero cards and primary buttons. No 1px borders except internal table rules.
- **Shadows:** uniformly offset down-right, never centered or diffuse. `--shadow-btn` 4px/4px, `--shadow-card` 6px/6px, `--shadow-ticket` 10px blur + inset white highlight (laminated paper).
- **Perforations:** dashed 2px rules divide sections and list items — never solid hairlines between sections.
- **Stamps:** countdown badges and meta badges are tilted blue-bordered postal marks.
- **Barcode:** decorative barcode strip in the footer — the deli receipt mark.
- **Backdrop:** floating fruit shapes (kiwi slices with seed rings, golden peel blob, olive leaves — `DeliBackdrop.astro`) are pinned to the viewport's left/right gutters only, shown at ≥2xl (1536px) where the centered 1200px content column leaves real margins — they can never sit behind body text while scrolling. `pointer-events-none`, `aria-hidden`, drift disabled under `prefers-reduced-motion`.
- **Buttons:** press = the stamp sinks (translate 4px, shadow collapses). All transitions list `box-shadow`, `translate`, `background-color` explicitly; `prefers-reduced-motion` disables motion.

## Components

- **Generator (order pad):** cream 4px-border card, 6px offset shadow; left = key input, right = white token panel with segmented progress, mono digits, green copy CTA, dashed privacy note, recent-keys list.
- **Nav pills:** rounded-full, 2px ink border, active = green fill; cream sticky bar with 3px ink base border.
- **Tickets (steps):** rectangular cream cards, perforated dashed top edge, red Inter-black step numbers.
- **Menu board (guides index):** cream board with a dark header bar; line items with Inter-black "price" (duration) right-aligned, dashed separators.
- **CTA banner:** ink panel, 4px border, green Rubik 800 heading, cream body copy.
- **Nutrition panels:** pure white, 2px ink border, sharp 2px corners — the only place white is used.

## Accessibility

- Dark-on-cream and dark-on-green text meet 4.5:1; orange is never a text color.
- Focus ring: 3px ink outline (cream on dark surfaces) — high contrast on orange, cream, and white.
- All icon-only controls carry `aria-label`s; the token display is a `role="status"` live region.
- `prefers-reduced-motion` disables the QR scan sweep, code ticks, toasts, and list animations.
