# Deck of Many Brews v122 PWA

Static PWA build for Cloudflare Pages, GitHub Pages, Netlify, Vercel, or similar static hosting.

## Cloudflare Pages

Use the repository root as the output directory. No backend is required.

Suggested settings:
- Framework preset: None
- Build command: exit 0
- Build output directory: /
- Production branch: main

## Update notes

Version: v122

Changes:
- Gear upgrade tools moved into a separate in-page tools view.
- Weapon comparison/attack tools moved into a modal window.
- War Tactics filters rebuilt as All / Paths / Tactics plus multi-select Tier I/II/III.
- War Paths use compact scrollable card rows with differentiated fantasy icons.
- Tactic tags are hidden from War Tactics cards to reduce clutter.
- Added scroll-safety CSS overrides for pages and mobile shell.

LocalStorage keys are preserved. Use Export All before major updates.
