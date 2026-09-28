# Licences and asset sources

Every file that ships with the game is listed here.

## Art: characters, plants, props, icons, scene

All visual art is **original vector art written for this game** as SVG and CSS in
`js/ui/art.js`, `js/ui/scene.js` and `css/game.css`. This covers:

- the characters (Tito Scorch, Abuela Rosa, Dana, Boots, Marcus Vega, Mayor Hildy,
  Cousin Marco, Sal, Crystal, the walk-in buyers and the crew),
- the nine pepper shapes, the plants in every growth stage, and the pots,
- the grow-room props and every UI icon.

No third-party images, sprites, photos or AI-generated images are used.

Tito Scorch is an invented character. He is not based on any real person.

| Asset | Source | Licence |
|---|---|---|
| All SVG art and icons | Original, this repository | Same licence as the game code |

## Fonts (self-hosted in `fonts/`)

| File | Font | Author | Source | Licence |
|---|---|---|---|---|
| `fonts/lilita-latin.woff2`, `fonts/lilita-latin-ext.woff2` | Lilita One | Juan Montoreano | Google Fonts (fonts.gstatic.com) | SIL Open Font License 1.1, see `fonts/OFL-LilitaOne.txt` |
| `fonts/fredoka-latin.woff2`, `fonts/fredoka-latin-ext.woff2` | Fredoka (variable) | The Fredoka Project Authors | Google Fonts (fonts.gstatic.com) | SIL Open Font License 1.1, see `fonts/OFL-Fredoka.txt` |

## Sound and music

All sound effects and the background beat are synthesized live with the Web Audio API
in `js/audio.js`. The game ships no audio files.

## Reference material

Screenshots of *Weed Firm 2: Back to College* (Manitoba Games) and *Wiz Khalifa's Weed
Farm* (Metamoki) were studied **for internal visual comparison only**. They are not part
of the game, and they are not committed to this repository. `qa/.gitignore` excludes the
side-by-side comparison sheet, which exists only on the build machine. No names, logos
or art from those games are used.

## History

Earlier builds rendered pepper sprites from CC-BY Sketchfab models. Those sprites and
their toolchain were removed in the 2026-09 presentation rebuild, and none of them ship
any more.
