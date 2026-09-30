# Playbook: look, feel, progression and iPhone reliability

Research-backed recipes for the arcade's games. Read the "Do this first" list at the top of each file; the rest is reference.

| File | Read it when you are... | Runnable |
|---|---|---|
| [LOOK_REALISTIC.md](LOOK_REALISTIC.md) | **the current art direction** (Caleb's farm key art): warm PBR, real CC0 textures, haze, water, dense foliage, navy-glass UI | [look-real-demo.html](look-real-demo.html) (`?ui=hud\|sheet\|title\|none&tm=&shadow=&foliage=&fog=&cam=&still=`), assets and licences in [real-assets/](real-assets/LICENSES.md) |
| [LOOK.md](LOOK.md) | the general render rules (colour space, fog and tone mapping, shadows, budgets). Its toon recipes are the *old* direction; the last section says how to move from toon to realistic | [look-demo.html](look-demo.html) (toon farm scene, `?tm=&toon=&outline=&shadow=&fog=&grass=`) |
| [FEEL.md](FEEL.md) | adding juice: shake, hit-stop, squash, coins, pops, combos, sound, haptics | [feel-kit.js](feel-kit.js) |
| [PROGRESSION.md](PROGRESSION.md) | designing levels, XP, shops, dailies, unlocks for a genre; keeping it child-safe | [progression-kit.js](progression-kit.js) |
| [IPHONE.md](IPHONE.md) | anything that must not break on iOS Safari; the 25-item pre-flight | [iphone-kit.js](iphone-kit.js) |
| [VIDEO_NOTES.md](VIDEO_NOTES.md) | outlining the YouTube video | |

Use a kit in a single-file HTML game with one line: `<script src="../docs/playbook/feel-kit.js"></script>` (paths relative to your game), then `Feel.Shake`, `IPhone.audioGate()`, `Progression.xpFor(...)`. Each kit is dependency-free, ES2020, no build step. Copy the file into the game folder if the game must stand alone (external repos).

Tests: `tests/*.html` are unit pages, `tests/run.mjs <url>` runs a page in Chromium and Playwright WebKit (iPhone 13 profile) and prints `window.__results`. `tests/run-all.sh` regenerates `tests/results/*.json` (`run-rest.sh` and `run-logs.sh` are slot-lock subsets of it); `tests/check-snippets.py` proves every code block in these files is verbatim from a tested file. `tests/look-real-check.mjs` measures the realistic demo (draw calls, triangles, texture memory, frame colour stats, shader errors, context loss) in both engines and `tests/make-sheet.py` builds the side-by-side against the key art. Browser jobs on the shared box go through `scratchpad/slot.sh`.

**Honest limit.** All "pass" claims are Chromium 141 (SwiftShader) and Playwright WebKit 26.0 on Linux. Neither is an iPhone: no Apple GPU, no jetsam memory kills, no Safari toolbar, no notch, no sound card, no haptics. `IPHONE.md` lists what each test can and cannot show. One real-iPhone session is still owed.
