# Deck of Many Brews v139 — Stability Rollback

This build restores the last stable v137 runtime after v138 caused the app/page to stop working.

## Contents
- index.html
- app.css
- app.js
- manifest.webmanifest
- service-worker.js
- version.json
- icons/

## Notes
- Version synced to v139 in app runtime, HTML meta, version.json, and service worker cache.
- localStorage data compatibility is preserved.
- v138 background/class-progression changes are intentionally not included because the page broke.

## Deploy
Upload the extracted contents to the GitHub repository root and commit to main. Cloudflare Pages will deploy automatically.
