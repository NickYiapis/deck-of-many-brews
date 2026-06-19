# D&D Homebrew Compendium PWA

Version: v121-pwa.1

Upload every file in this folder to the root of a static host such as Cloudflare Pages, Netlify, Vercel, or GitHub Pages.

Required files:
- index.html
- app.css
- app.js
- manifest.webmanifest
- service-worker.js
- version.json
- icons/icon-192.png
- icons/icon-512.png

Update flow:
1. Deploy a new build with a new version string in version.json, app.js, and service-worker.js.
2. Existing users will be prompted instead of silently forced to update.
3. The Update button activates the waiting service worker or refreshes the cached shell, then reloads.
4. LocalStorage data remains in the browser; use Export All before major releases.

Important testing notes:
- Service workers require HTTPS, except on localhost.
- Offline mode works after the first successful online load.
- iOS installation is manual through Safari: Share → Add to Home Screen.
- Android/Chrome should show install support once served over HTTPS.


## v121-pwa.2
Safe service-worker refresh/offline fallback fix. Preserves localStorage data.
