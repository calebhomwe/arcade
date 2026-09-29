# Notes for Kingdom Defense and Summit Line (owner's code)

These two games are Caleb's, still under active work on main. The arcade integrates them only through
`arcade-hooks.js` plus one `<script>` line in each `index.html`; nothing in the games' own code was changed.
The items below are small changes in the games' own files that would let the hooks shrink and clear the
last standard failures.

## Kingdom Defense (`KingdomDefense/index.html`)
- Phone text under 12 px (standard U13): `.stat` 9px, `#controls>.btn` 9.5px, `.filter` 9px,
  `.card .name` and `.key` 9px, `.diff small` 7.5px, `.eyebrow` 8-11px, `.heroBtns .btn` 11px,
  `#rankTag` and `#xpNext` 10px, `.routeLegend` 10px.
- Buttons under 40 px on phones: `.segmented .btn`, `#soundBtn`, `#startWave`, `.filter`, `#rankOk`.
- Expose `KD.replayTutorial()` and `KD.toTitle()`, so the hooks stop resetting `tutorialSeen` and
  clicking Map Select.
- `finish()` can check `ArcadeSDK.cheated` itself before saving a best wave, XP or achievements.

## Summit Line
- `js/main.js` `handleEvent`: skip `camState.shake` for 'land' and 'crash' under prefers-reduced-motion.
- `js/main.js` `showResults`: skip `saveBest` when `window.ArcadeSDK && ArcadeSDK.cheated`
  (the hooks currently block that localStorage write from outside).
- `css/style.css`: `.credit` is 10px on phones and `.best` 11px in landscape; both should be 12px or more.
- The loader aborts `rider.gltf` / `boulder_01.gltf` (and before the hooks, `rider.bin` and the sky `.hdr`)
  when a newer request replaces them: standard U14 counts these as failed requests.
