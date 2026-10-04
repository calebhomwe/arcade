# GD1 progress note (Godot iPhone work) - IN PROGRESS
Scope now: city-builder, heat-firm, la-city, swellrider, tidebreak, tidebreak-world-tour (claire-big-life removed by lead; chef-chloe/heavens-grace untouched).

## Done
- NEW assets/godot-dpr-shim.js: lazy devicePixelRatio cap (phone 1.2 MP, tablet 4.2 MP, desktop untouched), budget from SCREEN area so it does not wobble with the Safari toolbar; ?dpr=N|native, ?dprmp=, ?dprmode= overrides; canvas fills window when capped (avoids Godot's 1px floor() edge); loading screen (title, percent, "starting", slow/stalled hint + Reload); context-loss and wasm-abort messages with Reload (replaces Godot's blocking alert); sessionStorage crash breadcrumb -> notice + lower tier (0.8 / 0.5 MP) for 24 h.
- tools/inject_sdk.py: adds the shim after the SDK tag in Godot exports, idempotent, skips FROZEN + NO_DPR_SHIM (heavens-grace, chef-chloe); --check covers it. Ran it: 6 index.html files got one extra <script> line (heavens-grace/chef-chloe have 0).
- Unit run in WebKit on a fake Godot-shaped page: 24/25 passed (desktop DPR 1/1.5/2/3 untouched; iPhone13 3->1.9 = 0.93 MP; Pixel7 2.625->1.78; iPads; overrides; breadcrumb; context loss; stock error notice; progress overlay states). The 1 fail (phase label after wasm abort) was fixed afterwards (halt()); not yet re-run.
- Real heat-firm in WebKit iPhone13 with shim: boots to title, canvas 741x1261 (DPR 1.9, was 1170x1992 at native), 12+ glBlitFramebuffer console errors as in IPHONE.md, UI legible in screenshot but tiny game text is a game-design issue. Centre tap missed the Play button (needs per-game tap coordinates).

## Not yet done (machine queue was slow, then the container restarted)
- WebKit + Chromium native-vs-shim matrix for the six builds; per-game tap test; Chromium throttled-download progress screenshot; re-run unit in Chromium.
## Files changed in /home/user/arcade
assets/godot-dpr-shim.js (new), tools/inject_sdk.py, Godot/{city-builder,heat-firm,la-city,swellrider,tidebreak,tidebreak-world-tour}/index.html
## Unverified so far: real Apple GPU, jetsam kills, audio.
