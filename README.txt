CALEB'S ARCADE
==============

The front door for every browser game Caleb has shipped: 110 games,
no ads, no accounts, no installs. Live at https://calebhomwe.github.io/arcade/

WHAT IS HERE
  index.html            the portal: featured hero, category rails, search,
                        favourites, "continue playing", the full grid
  play.html?g=<id>      the play page: the game in a stage with fullscreen,
                        restart, share, and "more like this"
  catalog.js            the single source of truth for every game
                        (generated -- do not hand-edit)
  tools/build_catalog.py  regenerates catalog.js. Add or edit a game there.
  assets/thumbs/        one real captured frame per game, 480x300 webp
  assets/og.png         the link-preview card
  <GameFolder>/         the 14 cabinets that live in this repo
  manifest.webmanifest  + sw.js: installable, and the shell works offline
  sitemap.xml, robots.txt  generated with the catalogue (one URL per game)

WHAT THE VISITOR CAN CHANGE (gear button, or press ,)
  Theme dark / light / system, accent colour (amber, cyan, pink, lime,
  violet), card size, motion on/off, whether cards say where a game lives,
  the default stage size on the play page (Fit / 16:9 / 4:3 / Tall / Fill --
  each game also remembers its own), and whether other-site games open in a
  new tab behind a launch button. "Your data" exports and imports favourites,
  play history, bests and settings as one JSON file, or clears them.
  Everything is localStorage under ca_*; nothing leaves the browser.

  Shortcuts: / search, Esc clear, S random game, , settings; on a play page
  F fullscreen (Theatre mode where the browser has no fullscreen API),
  R restart, N next game like this one.

  Shareable views: index.html?cat=learning&q=maths&fav=1&sort=az
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
  Every play page ends with "How was it?": Fun / OK / Broken plus a note.
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
  3. Capture a 480x300 frame of it playing into assets/thumbs/<id>.webp.
  4. python3 tools/build_catalog.py   (it refuses if the thumb is missing;
     also rewrites sitemap.xml and robots.txt)

TO RUN LOCALLY
  Any static server from this folder, e.g.  python3 -m http.server 8800
  then open http://localhost:8800/
