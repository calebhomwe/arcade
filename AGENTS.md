# Agent guide: Caleb's Arcade

Read `docs/HANDOFF.md` first. It has the goal, repo map, how to run and test, what is done, the open list, the decisions that belong to the owner, and the rules to keep.

Quick rules:
- Do not touch NISTAR, Heaven's Grace or the Chef Chloe games; keep faith content; Kingdom Defense and Summit Line game code is the owner's (hooks only).
- Never print or commit an API key (ElevenLabs, Meshy). None are in the repos.
- After changing games or their `qa/standard/meta/*.json`, run `python3 tools/game_meta.py && python3 tools/build_catalog.py`.
- External games (hub, neon, playables, bloxburg-town) go live when *their* repo's default branch deploys, not when this repo does.
- Test on a 390x844 touch screen in WebKit and Chromium, look at every screenshot, and say plainly what you did not verify (no real device unless you used one).
