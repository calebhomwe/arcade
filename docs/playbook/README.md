# Playbook: look, feel, progression and iPhone reliability

Research-backed recipes for the arcade's games. Read the "Do this first" list at the top of each file; the rest is reference.

| File | Read it when you are... | Runnable |
|---|---|---|
| [LOOK.md](LOOK.md) | making a three.js or canvas game look like a real mobile game | [look-demo.html](look-demo.html) (farm scene, every recipe, `?tm=&toon=&outline=&shadow=&fog=&grass=` flags) |
| [FEEL.md](FEEL.md) | adding juice: shake, hit-stop, squash, coins, pops, combos, sound, haptics | [feel-kit.js](feel-kit.js) |
| [PROGRESSION.md](PROGRESSION.md) | designing levels, XP, shops, dailies, unlocks for a genre; keeping it child-safe | [progression-kit.js](progression-kit.js) |
| [IPHONE.md](IPHONE.md) | anything that must not break on iOS Safari; the 25-item pre-flight | [iphone-kit.js](iphone-kit.js) |
| [VIDEO_NOTES.md](VIDEO_NOTES.md) | outlining the YouTube video | |

Use a kit in a single-file HTML game with one line: `<script src="../docs/playbook/feel-kit.js"></script>` (paths relative to your game), then `Feel.Shake`, `IPhone.audioGate()`, `Progression.xpFor(...)`. Each kit is dependency-free, ES2020, no build step. Copy the file into the game folder if the game must stand alone (external repos).

Tests: `tests/*.html` are unit pages, `tests/run.mjs <url>` runs a page in Chromium and Playwright WebKit (iPhone 13 profile) and prints `window.__results`. `tests/run-all.sh` regenerates `tests/results/*.json`; `tests/check-snippets.py` proves every code block in these files is verbatim from a tested file. Browser jobs on the shared box go through `scratchpad/slot.sh`.

**Honest limit.** All "pass" claims are Chromium 141 (SwiftShader) and Playwright WebKit 26.0 on Linux. Neither is an iPhone: no Apple GPU, no jetsam memory kills, no Safari toolbar, no notch, no sound card, no haptics. `IPHONE.md` lists what each test can and cannot show. One real-iPhone session is still owed.
