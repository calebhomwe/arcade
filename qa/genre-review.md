# Genre fidelity review — 26 September 2026

## Kingdom Defense
Benchmark: lane-based tower defense, especially Bloons-style layered enemies. Strategy must come from placement, spending, target priority, enemy counters and upgrades. Particle effects do not substitute for these mechanics.

Repaired: phone-scaled placement clearance; continuous simulation through kill effects; marked-target damage; temporary cold adjacency effects; progress-based multi-route targeting; predictable opening budget; intentional wave start; reset of auto-wave mode. Higher ordinary layers cost more lives on leakage, and combo cash has a cap.

Remaining criticism: world distances still depend on the viewport. A full logical-coordinate migration is needed for identical balance between portrait and desktop. Full campaign and all 25 tower builds have not been certified. A first-wave pass is not a balance certification.

## Summit Line
Benchmark: SSX-style downhill racing and trick risk/reward. Carving, speed management, charging a jump, landing orientation, grinding and boost should drive the experience.

The recovered Claude branch was unpublished. It contains locally served, licensed snow and rock textures, photographic tree atlases, sky and base models. The original source credits are retained in `SummitLine/LICENSES.md`. No new hand-drawn or generated artwork was created in this pass. Existing procedural course geometry and rider clothing remain.

Repaired: immediate boost response; less speed loss at jump lips; limited air steering; rail score banks on landing and is lost on a crash; finished rival behaviour; input release when interrupted; clean restart; WebGL interruption message. Added an earlier training jump and rail. Reduced phone scenery/shadow work while retaining textures. Added a compact landscape phone layout.

Remaining criticism: this is a browser interpretation, not SSX feature parity. It lacks a full event progression system and substantial course variety. Automated phone emulation does not certify physical iPhone Safari, sustained frame rate, heat, memory pressure or gamepad hardware.

## Evidence policy
`qa/harness/genre.mjs` exercises rendered controls and reads state to assert effects. Separate physics fixtures are explicitly labelled and never presented as human play. It checks a complete opening tower wave and a short snowboard session, not a complete snowboard race. Screenshots and machine-readable results are in the workflow artifact. Failed checks remain failures until fixed and rerun.

The earlier 110-game generic harness provided smoke coverage only. This focused work does not certify every other game.

## Reference sources
- Publisher description: https://store.steampowered.com/app/960090/Bloons_TD_6/
- EA SSX: https://www.ea.com/games/ssx
- Snow: https://polyhaven.com/a/snow_02
- Trees: https://polyhaven.com/a/fir_tree_01
- Base character: https://quaternius.itch.io/universal-base-characters
