# 2FA COUNTER — 2facounter.com

A fast, free, private 2FA / authenticator app that runs entirely in the browser.
Paste a secret key (or scan a QR code with the camera / upload a QR screenshot)
and get a live TOTP/HOTP code — generated locally with the Web Crypto API.
Keys are cached only in the device's local storage; there are no servers.

## Stack

- [Astro](https://astro.build) (static output) + [Tailwind CSS v4](https://tailwindcss.com)
- Web Crypto (HMAC-SHA-1/256/512) — RFC 6238 / RFC 4226
- `jsqr` for on-device QR decoding (bundled, no CDN)

## Project structure

```text
/
├── public/              # favicon, PWA icons, manifest, service worker
├── src/
│   ├── components/      # Generator, token panel, header/footer, guide layout
│   ├── layouts/         # Base HTML layout (fonts, meta, service worker)
│   ├── pages/           # index, about, contact, privacy, guides/*, preview
│   ├── scripts/         # generator.ts — client-side TOTP/HOTP engine
│   └── styles/          # global.css — Tailwind theme + component primitives
├── DESIGN.md            # design system spec (deli/identity theme)
└── e2e-smoke.mjs        # Playwright smoke test suite
```

## Commands

| Command             | Action                                    |
| :------------------ | :---------------------------------------- |
| `npm run dev`       | Starts local dev server (background)      |
| `npm run build`     | Build the production site to `./dist/`    |
| `npm run preview`   | Preview the production build locally      |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`)         |
| `npm run test:e2e`  | Run the Playwright smoke tests (dev server must be running) |
