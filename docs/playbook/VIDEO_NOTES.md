# VIDEO_NOTES: "An AI swarm builds and QA's a 107-game arcade" (candid outline)

Written for Caleb from what is in `/home/user/arcade` (`docs/`, `qa/`, `git log`), the four critic reports (`scratchpad/claire_r{3,4,5}_critic/REPORT.md`, `claire_r2_critic.md`, `surf_critic/REPORT.md`, `surf_critic/r3/REPORT.md`) and the briefs. Every number below has a file behind it. **Things I could not find are marked "not in the repo"; do not say them on camera until you have them.**

## The honest one-paragraph story

You asked an AI swarm to turn a shelf of half-finished web games into a proper arcade. It did the boring, scalable part very well: one portal, one SDK, one 25-point standard, one harness, and 70-plus commits in a week (`git log`: 31 on 28 September alone). It did the *taste* part worse than it said it did. Independent critics kept scoring the games 5 to 6 out of 10 while the builders scored themselves 7 to 8, and the fifth round on the flagship (Claire's Big Life) scored lower than the fourth (5.6 vs 6.1). Then your sister opened the arcade on an iPhone, and the sharpest problems were ones nobody had been able to see: the tests ran in Chromium, not Safari, and the biggest games are 65 to 115 MB downloads. The fix that matters is not more polish: it is testing in the engine your audience uses.

## What worked (with proof)

| What | Evidence |
|---|---|
| A standard everyone is graded on | `qa/standard/STANDARD.md`: 18 universal rules, 3 help rules, genre modules, cheat-code policy. Baseline run over 111 games x 25 checks: **1,936 PASS, 301 FAIL, 330 REVIEW, 208 N/A = 69.8% pass** (`qa/standard-results/matrix.json`, 2026-09-28 07:55). A later full run is not in the repo; add it before filming. |
| One SDK that fixes games without rewriting them | `assets/arcade-sdk.js` freezes rAF, timers, `performance.now`, Web Audio and Web Animations together on pause; adds mute, a standard pause menu, hints, cheats, orientation card. Wired into 38 games at baseline. |
| A fast, accessible portal | `qa/portal/NOTES.md`: home 750 to 920 KB, first paint 0.27 to 0.8 s, axe-core 0 violations in 8 runs, 0 console errors in 21 captures. Key-art tiles rendered from real game frames (`tools/keyart.py`). |
| Real 3D instead of flat 2D | commits `7f27051`, `509ea9c`, `1e3b4da`, `9b91b1e`: Hole Grind, Hole Swallow, Helix Smash, Stack Ball, Helix Drop, Crowd Clash, Rung Runner, Bridge Rush, Mini Life Sim, Bridge Race Classic, Hole Eater and Maths Kart render in three.js, with licensed CC0 models optimised by `tools/blender/optimize_glb.py`. |
| Audio pack | `tools/audio/elevenlabs.py` plus `assets/sfx/kit.json` (30 sounds) and `ArcadeSDK.sfx()`; voice, music and SFX for Chili Firm, Kingdom Defense, Summit Line (`d9a191f`, `64e8d60`). |
| iPhone check improved through iteration | `7afc0e8` 87 of 107 ready, then `2244f43` 99 of 107 (fixes: turn-sideways card, floating Play button). The remaining 8 were the 7 Godot builds and the Unity one (`qa/iphone-results/iphone.json`). |
| Honest gates | `QUALITY_GATE.md`: pass needs 8+ on every axis from a critic who is not the builder; "a claim in a report that the evidence does not show" is an automatic FAIL. This rule caught real overclaiming (below). |

## What failed or plateaued, and why

**1. Critic vs builder scores (from the reports).** The builder's numbers are the ones written in each critic's table.

| Round | Builder A B C D E F G (avg) | Critic A B C D E F G (avg) | Verdict |
|---|---|---|---|
| Claire r2 | not recorded | 4 5 3 5 6 4 7 (4.9) | FAIL, 4 hard fails |
| Claire r3 | not recorded | 5 6 4 6 6 5 7 (5.6) | FAIL |
| Claire r4 | 6 7 6 7 7 6 8 (6.7) | 6 6 5 6 6 6 8 (6.1) | FAIL |
| Claire r5 | 6 7 6 7 7 7 8 (6.9) | 6 6 5 5 6 5 6 (5.6) | FAIL, new hard fail: phone market runs off the screen |
| SwellRider r1 | 7 8 7 8 8 8 9 (7.9) | 5 6 5 7 6 7 6 (6.0) | FAIL |
| SwellRider r3 | not recorded | 6 6 5 7 6 7 7 (6.3) | FAIL |

Draw this as a two-line chart: builder self-score above, critic score below, both flat. The gap is 0.6 (Claire r4) to 1.9 points (SwellRider r1); it never closes.
**2. Builders overclaimed, and the critic measured it.** Claire r5: ripe wheat "#d9b24a" is the shader constant, on screen it measures #b18f39; the handoff table said 721 draw calls, Godot measured 1,655; a "second ship" and a "head-and-shoulders bust" were not in any capture; the frame-time "regression" (0.96 s to 17.5 s) was a wrong baseline plus another agent's browser using 261% CPU.
**3. The remaining gaps are art, not code.** Claire and SwellRider both fail axes A, B and C on materials and shapes (cylinder bales, a slab for a ship, a wave lip that is "one hard, straight edge"). Meshy had a valid key and **0 credits** and Hugging Face ZeroGPU quota was 0 (`QUALITY_GATE.md`), so the swarm fell back on procedural geometry and CC0 kits. You said it yourself: "I want no cube stuff", "Looks nothing like what I want".
**4. Fixing one thing broke another.** Round 5 fixed crops, the phone title and building taps, and introduced a phone market sheet wider than 390 px. Phone chrome covered 55% of the screen in round 3 and still 40% in round 5; round 2's rail hid the left 40%.
**5. You could not see it run.** Software rendering took 3 to 8 seconds per frame on the shared 4-core box (critic r5), so builders judged screenshots, not play.
**6. Chromium is not Safari.** The iPhone check ran in "iPhone 13 (Chromium emulation)" and said 99 of 107 ready; `qa/harness/iphone.mjs` now has `ENGINE=webkit`. Godot web exports have documented iOS reload bugs (`IPHONE.md`).
**7. The download is the game.** Godot builds: `godot.wasm` 10.2 MB gzipped on the live site plus Claire 64.9 MB, LA City 75.0 MB, Heaven's Grace 41.9 MB, Swellrider 35.9 MB (`curl -I` on calebhomwe.github.io, 2026-09-29). CrazyGames wants 20 MB for its mobile homepage.
**8. Deployment drift.** The brief says the live site still served old versions because arcade PR #4 was not merged. Verify before you film; say so if it is still true.
**9. Progression came late.** Your own priority (message 24 in `user_asks.md`) was "get the main base game down first. The dopamine loop, progression etc", but the checklist said nothing about levels, unlocks or return visits until Brief v2. `PROGRESSION.md` is the fix. **10. Process friction.** 15 of your 77 messages in `user_asks.md` are stop-hook notices about uncommitted or unpushed work. Automation that nags is a cost too.
**11. Two products got merged.** The kid-UX critic found two friends systems, Milo as both baker and farmer, five currencies, a goal card that ends after 5 goals (`critics/kid.md`): "Verdict 25-30%".

## 8 to 10 before/after moments (capture these)

1. **Portal tiles:** `qa/portal/tiles_before.jpg` then `tiles_after.jpg` (flat placeholders to key art from real frames).
2. **Claire first view, r3 to r5:** `claire_r3_critic/d03_first_view.png` vs `claire_r5_critic/d03_first_view.png` (planks on lawn and black squares to crops in rows, a red barn, cows).
3. **Claire title:** `d01_title.png` in r3 vs r5 (flat slab to a sky, a logo, a bridge, a port).
4. **The black-square bug:** `claire_r3_critic/crop_d03_beds.png` and `crop_d03_house.png` (shadow blobs rendered as solid black squares) vs `claire_r5_critic/crop_d03_field.png` (the round-5 critic no longer reports them).
5. **Claire on a phone:** `claire_r3_critic/p03_first_view.png` (chrome covers 55%) vs `claire_r5_critic/p03_first_view.png` (40%), then `p06_market_sell.png` (the new overflow bug). The failure and the fix in one cut.
6. **Reference vs ours (internal only):** `scratchpad/3d1/compare_sheet.png` (Hole Grind / Helix Smash / Stack Ball beside the games they chase). **Do not put commercial screenshots in a public video**; the gate says references are for internal comparison. Show only your side, or blur the reference.
7. **SwellRider:** `surf_critic/desk_01_title.png` and `desk_13_wipeout_b.png` (60% of the frame washed white) next to the real Pipeline photo `swellrider-godot/qa/web/refs/pipeline_barrel.jpg` (round 3 fixed the white-out, `surf_critic/r3/REPORT.md`).
8. **Chromium says fine, WebKit tells the truth:** run `ENGINE=webkit node qa/harness/iphone.mjs` on a Godot game live, side by side with the Chromium result. In my run Godot 4.7 booted in Playwright WebKit and drew its title screen (`docs/playbook/tests/results/godot-webkit.json`); iPhone hardware remains unverified.
9. **The look recipe:** `docs/playbook/img/look-tonemap-sheet.jpg`, the same farm under AgX, ACES, Neutral and no tone mapping (mean saturation 0.402, 0.508, 0.663, 0.545): a five-second "why colour looks washed out".
10. **The download bar:** one bar chart of gzipped sizes (0.7, 4.2, 35.9, 41.9, 64.9, 75.0 MB) with the 20 MB line drawn across it (each is the game's `.pck` gzipped; add 10.2 MB for the engine).

## Suggested screen-capture shots

- Terminal: `node qa/harness/standard.mjs` filling the 25-column matrix; `GAME_IDS=... ENGINE=webkit node qa/harness/iphone.mjs` beside the same in Chromium.
- A critic `REPORT.md` scrolling to the red "Hard fails" list, then the builder's claim it contradicts (r5 claims 1 to 7).
- Playwright's WebKit window at 390x664, a Godot game booting; DevTools showing 1,655 draw calls.
- `look-demo.html` at iPhone size with `?tm=agx` then `?tm=aces`; tap Harvest and let the coins fly (`docs/playbook/tests/results/look-interact.json`).
- `curl -I` on the live `godot.wasm` showing `content-encoding: gzip`, `content-length: 10246865`.
- The GitHub branch page showing PR #4 unmerged and the site's last-modified header.
- A phone in your sister's hand (with her permission), Safari, the arcade, a Godot game loading on cellular with a stopwatch.
- The `git log --oneline` scroll, 10 to 29 September (per day: 7, 9, 7, 20, 31 and 16 on 22, 23, 24, 26, 28 and 29 September).

## Suggested structure (10 to 14 minutes)

1. **Cold open (0:00):** your sister's verdict, in her words as relayed in the brief: some games work; Claire's "stays fixed on one angle and doesn't look appealing"; others "don't work, freeze, look super lame and poor". Ask permission first.
2. **The premise (1:00):** 111 games in the catalogue (107 in the iPhone check), one owner, agents in parallel. Show the list, the genres (`assets/game-meta.json`: 75 canvas-2D, 20 DOM, 6 three.js at baseline, 9 Godot, 1 Unity).
3. **Act 1, the boring thing that worked (2:30):** the standard, the SDK, the harness.
4. **Act 2, the critic loop (4:30):** Claire r2 to r5, the two-line chart, the overclaiming, "you are being too easy with the quality gate".
5. **Act 3, the plateau (7:00):** items 3 to 5 above; art needs real assets; no Meshy credits.
6. **Act 4, the phone (8:30):** the sister test, Chromium vs WebKit, the 65 MB download, memory and audio reloads on iOS.
7. **Act 5, look before you leap (10:30):** the research (this playbook): what Poki, CrazyGames, Hay Day, Vampire Survivors do; show the tone-map sheet and the coin-fly.
8. **Close (12:30):** the honest scoreboard, what a real-iPhone test still has to prove, what you would do next.

## What a viewer will ask

- **Cost:** *not in the repo.* The only cost signals are your own words ("use fable only when needed ... other sub agents at lower credits"), Meshy at 0 credits, ElevenLabs credits, and free CC0 assets. Pull real numbers from your billing pages before you say one.
- **How many agents, which models:** not recorded here beyond "several builders in parallel, six critic lenses (code, economy, gates, kid UX, requirements, visual)" (`scratchpad/critics/`). State only what you can show.
- **Harnesses:** `qa/harness/` (run, standard, iphone, genre, sdk-test, snowphysics), 25 checks, 8 CI shards on GitHub Actions, WebKit through Playwright 1.58.2, Blender 4.2.5 for model optimisation, gltfpack, ElevenLabs for sound.
- **Critics:** read-only, run the game themselves, look at every screenshot, measure pixels (green share, mean brightness, share of dark pixels, draw calls), must quote file and line, ranked top-10 fixes. Their rule: builders are not believed.
- **Why not just trust the tests?** The harness says "interaction-observed is not a claim that every mechanic works" (`qa/harness/README.md`) and "browser automation cannot certify game quality". Say this out loud.
- **Licences:** CC0 assets and OFL fonts recorded per game in `LICENSES.md`; no AI-image watermarks; Bible content kept as is.
- **Kids and safety:** no ads, no accounts; see `PROGRESSION.md` for what the games must not do.
- **What is still fake?** Real-device behaviour. Playwright WebKit is a desktop build (`IPHONE.md`); no one has yet shown the arcade running for five minutes on a real iPhone.

## Do not say, do not show

- Do not show or read out any API key (a Meshy key appears in the message log; it is redacted in `user_asks.md`, but do not open that file on camera).
- Do not say "works on iPhone". Say "passes in WebKit, waiting for a real phone".
- Do not use the builders' self-scores as results. Use the critics'.
- Do not show commercial reference screenshots; do not use the kids' names or your sister's phone without her say-so.

## Sources

Files named above; [Godot issue #107390](https://github.com/godotengine/godot/issues/107390) and [PR #107948](https://github.com/godotengine/godot/pull/107948) for the iOS audio reload; [CrazyGames technical requirements](https://docs.crazygames.com/requirements/technical/) for the 20 MB line; `LOOK.md`, `FEEL.md`, `PROGRESSION.md`, `IPHONE.md` in this folder.
