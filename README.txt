CALEB'S ARCADE
==============

The front door for every browser game Caleb has shipped: 110 games,
no ads, no accounts, no installs. Live at https://calebhomwe.github.io/arcade/

WHAT IS HERE
  index.html            the portal: a mosaic of big and small tiles, rows
                        (Continue playing, Because you played, Favourites,
                        New, Popular, one per category), a side rail of
                        categories (chips on phones) and instant search.
                        Views: ./?cat=<id>  ./?view=new|popular|recent|
                        favourites|all  ./?q=<words>  (&sort=az|newest|...)
  play.html?g=<id>      the game page: a "Play" splash over the art, then the
                        game; like / favourite / share / screen size /
                        restart / new tab / fullscreen, how-to-play, facts,
                        tester feedback, an "Up next" rail and more rows
  catalog.js            the single source of truth for every game
                        (generated -- do not hand-edit)
  tools/build_catalog.py  regenerates catalog.js. Add or edit a game there;
                        POPULAR near the top ranks the "Popular" row.
  tools/portal_shell.py   called by build_catalog.py: writes the side rail,
                        phone chips, footer and icon sprite into index.html and
                        play.html between <!--@...--> markers
  assets/thumbs/        one real captured frame per game, 480x300 webp
  assets/previews/      optional short hover loops, <id>.webp (picked up
                        automatically by build_catalog.py)
  assets/fonts/         Fredoka + Nunito (SIL OFL, see LICENSE.txt there)
  assets/og.jpg         the link-preview card
  <GameFolder>/         the 14 cabinets that live in this repo
  manifest.webmanifest  + sw.js: installable, and the shell works offline
  sitemap.xml, robots.txt  generated with the catalogue (one URL per game)

WHAT THE VISITOR CAN CHANGE (gear button, or press ,)
  Theme day / night / match device (also the sun-moon button in the top
  bar), accent colour, tile size, motion on/off (the device's reduced-motion
  setting is followed by default), whether game names show under tiles,
  the default stage size on the play page (Fit / 16:9 / 4:3 / Tall / Fill --
  each game also remembers its own), and whether other-site games open in a
  new tab behind a launch button. "Your data" exports and imports favourites,
  play history, bests and settings as one JSON file, or clears them.
  Everything is localStorage under ca_*; nothing leaves the browser.

  Shortcuts: / search, Esc clear, S random game, , settings; on a play page
  P play, F fullscreen (Theatre mode where the browser has no fullscreen
  API), R restart, N next game, L like.

  Shareable views: ./?cat=learning   ./?q=maths   ./?view=all&sort=az
  Random game:     play.html?g=random

  Godot/                the Godot 4 games as HTML5 builds. Godot/_engine/ holds
                        ONE copy of the engine (godot.wasm + loader, ~38 MB);
                        every Godot/<game>/ folder is just index.html + its
                        .pck, with the loader config pointed at ../_engine.
                        Rebuild a game: godot --headless --export-release Web
                        (web_nothreads template; GitHub Pages sends no COOP/COEP
                        headers, so the threaded template will not run there).
  ClairePip/ SneakerDrop/ DeepcutMine/ CookRush/ TyphoonMine/ CleanHouse/
  TicTacToe/ SnapJigsaw/ NeonDash/ Dominion/ LivingWorld/ CritterRush/
  CritterRush2D/        more cabinets, copied from their source repos so the
                        shelf carries the newest build of each

TESTER MODE (for whoever is play-testing)
  Every play page has "Tester feedback": Fun / OK / Broken plus a note.
  Answers stay on the device; Settings -> Your data -> "Copy tester report"
  puts every rating and note on the clipboard as plain text to paste to
  Caleb, and "Export backup" includes them in the JSON too.

WHERE THE OTHER GAMES LIVE
  The remaining games are catalogued here but hosted on Caleb's other
  live GitHub Pages sites (arcade-hub, neon-game-arcade, playables,
  bloxburg-town).
  The play page opens them in place; nothing is copied.

TO ADD A GAME
  1. Put it in this repo (a folder with index.html), or note its live URL.
  2. Add one line to tools/build_catalog.py.
  3. Capture a 480x300 frame of it playing into assets/thumbs/<id>.webp
     (optionally a short loop into assets/previews/<id>.webp).
  4. python3 tools/build_catalog.py   (it refuses if the thumb is missing;
     also rewrites sitemap.xml and robots.txt)

TO RUN LOCALLY
  Any static server from this folder, e.g.  python3 -m http.server 8800
  then open http://localhost:8800/
