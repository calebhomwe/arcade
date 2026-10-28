# Mobile offline release

The existing 112-game catalogue and game URLs stay intact. The new `offline.html` page offers explicit downloads for the **99 entries already marked for phone play**: 31 local cabinets, 37 Pocket Arcade games, 25 Neon games and six Playables. This eligibility flag is inherited metadata, not a new physical-device certification. Thirteen desktop/engine or separately maintained builds retain their existing launch links and an explicit limitation. Nistar, Chef Chloe and the owner's Kingdom Defense/Summit Line gameplay code are not edited. Nistar’s existing worker receives only a cache-cleanup isolation hook: its old activation deleted every cache on the shared origin, including other installed games. Legacy `hg-*` caches are preserved; cleanup can only remove explicitly `nistar-*` names. A separate regression executes that real legacy worker and verifies the other applications’ caches survive activation.

## Install path after deployment

Open the existing [Caleb's Arcade](https://calebhomwe.github.io/arcade/) HTTPS site and choose **Offline games** (mobile category chips or desktop sidebar).

- **iPhone:** open in Safari, Share → Add to Home Screen; enable **Open as Web App** if offered. Open the installed icon online and use Offline games there.
- **Android:** Chrome → ⋮ → Add to home screen → Install, or use the Install arcade button when offered. Open the installed icon online.
- Download each desired game and wait for its **Ready offline** state. Close the app, enable airplane mode, reopen the installed icon, launch a downloaded game and check that progress survives a second close/reopen.

Installing the icon prepares the catalogue; it does not download every game. Each game has an exact byte count and verifies its own complete package. Browser eviction or clearing site data can remove downloads; readiness checks detect missing files. Progress remains in the same storage keys on the same origin/game URLs. Use the existing profile backup before intentionally clearing site data.

## Coordinated rollout

Deploy the `arcade-hub`, `neon-game-arcade` (default `master`) and `playables` PRs first, then the `arcade` PR. Each sibling owns a root `sw.js`, `offline-manifest.js`, `offline-worker.js`, and a checked-in package map. The portal registers a sibling's worker only on the player's explicit download. GitHub Pages' project paths share `calebhomwe.github.io` as an origin, but each worker has its own path scope and cache namespace. No CORS/opaque CDN caching is relied upon.

The siblings bundle an exact copy of the existing arcade SDK plus its 31 sound-kit files under `assets/offline-sdk/`. The 68 game-page edits only replace the remote-looking SDK URL with its local relative path; a byte-for-byte reconstruction of each original page verified that the gameplay body was unchanged. The SDK's storage keys and gameplay hooks remain identical. Sync this SDK snapshot deliberately when the canonical SDK changes.

The worker downloads only manifest-listed same-origin assets and validates byte size and SHA-256. Shared files use immutable digest keys in one per-repository asset pool; a single metadata write commits each game. Incomplete downloads are retryable and never count as ready. Previous complete package versions remain usable through a shell update. Existing opportunistic `arcade-v14-prog3` downloads are an offline fallback during migration, without being counted as newly verified packages. Cache cleanup touches only its own obsolete shell caches; no worker accesses localStorage or IndexedDB. The user applies waiting updates after finishing open games. Audio supports full and partial byte-range requests for Safari seeking.

All 99 packages together contain about 99 MB of unique assets across the four scopes; individual downloads share those assets. The initial portal shell is approximately 6 MB, including covers and local fonts. Retained old releases can consume additional space. The separate Heaven's Grace PR supplies its complete approximately 33 MB rhythm-game package; it is not silently substituted for the existing Nistar build.

## Build and verify

In each repository, after changing a shipped game or common asset:

```sh
python3 tools/build-mobile-offline.py
python3 tools/build-mobile-offline.py --check
node tools/check-mobile-offline.cjs
node --test qa/offline/worker.test.cjs
npm ci --prefix qa/offline
cd qa/offline && npx playwright install --with-deps chromium webkit
cd ../..
NODE_PATH=./qa/offline/node_modules node tools/test-mobile-offline.cjs
```

With all four sibling checkouts beside each other, regenerate the portal's download sizes and eligibility snapshot, then its shell:

```sh
python3 tools/aggregate-mobile-offline.py
python3 tools/build-mobile-offline.py
```

`GAME_IDS=high-nest,market-merge` narrows the browser test; `ENGINE=webkit` or `ENGINE=chromium` selects the engine. Each repository's CI checks all its listed offline packages. The browser harness installs and downloads online, closes the document, disables networking, launches a fresh game document with no HTTP-cache fallback (`no-store` server), performs source-authored start input and touch/keyboard actions, captures screenshots, and checks save values across reload. Reports explicitly label this **offline boot/input smoke**, not complete gameplay certification. Real media is not stubbed.

## Verification limits in this change

- Eleven worker regression cases pass locally: complete/missing-file readiness, failed/stale/quota-limited installs, deferred activation and isolated cleanup, cold navigation and query variants, audio ranges, atomic game downloads, retry, shared-asset deduplication/eviction, and legacy-download migration.
- All 99 package inventories pass local file/digest/size/entry checks. The existing portal PWA check passes with zero failures; its seven existing unreferenced cover-art files remain a report-only warning.
- Local browser execution is blocked: the managed preview daemon/mailbox is unavailable. The new Heaven's Grace Chromium and WebKit Actions jobs completed with no runner assigned and no steps executed. That is **no browser result**, not a gameplay failure or pass. Consult actual workflow logs and artifacts before approving release; no billing/settings changes were attempted.
- No physical iPhone or Android phone has been tested. Check standalone airplane-mode cold launch, audible audio/unlock, multi-touch/drag and hold behavior, GPU/context memory pressure, background/resume timing, Bluetooth latency, storage eviction, and save retention after a device restart. The large Godot/Unity exports and separately maintained builds need their own mobile work; they are not relabeled ready by this release.

References: [Apple web-app installation](https://support.apple.com/guide/iphone/iphea86e5236/ios), [Chrome Android web apps](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en).
