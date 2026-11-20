# Ocean expansion

The campaign now has 302 boards (167 added), across 21 regions. Levels 301–302 form the final region. Existing progress and balances remain compatible.

## Pieces and progression

Starfish, clams, octopuses, squid, reef fish, seahorses, rubies and sunstones join the five original pieces. The first additional piece becomes available at level 16; another becomes available every 15 levels. A rotating selection of five types appears on early boards, six from level 136 and seven from level 226. Collection objectives always select a type present in the board palette.

New campaign levels reduce moves from 28 toward 18 as difficulty tiers rise; score and collection targets grow. Existing score balance remains in place for levels 1–135. Twelve new milestone relics include the final Crown of the Living Ocean at level 302. Level generation is validated; late-game difficulty still needs human playtesting.

## Tools

- Depth Bomb: unlock level 16, place a 3×3 bomb, 80 pearls per additional tool.
- Turtle Torpedo: unlock level 46, place a guided weapon, 70 pearls.
- Current Shuffle: unlock level 91, rearrange the board without using a move, 50 pearls.

Clearing the level before each unlock grants three tools once. Open Tools on the bottom shelf to buy or use inventory. Arcade prizes can be earned before a tool unlock; they stay in inventory until its campaign requirement is reached.

## Ocean Arcade

Open Ocean Arcade from the map. All modes support touch; Reef Blocks also supports arrow keys, Space and P.

- Reef Blocks: seven falling block shapes, rotation with horizontal wall kicks, landing ghost, next-piece label, row clears and increasing drop speed. Clear 8, 12 or 16 rows for the three medals.
- Memory Dive: find 6, 8 or 10 matching pairs in 70, 60 or 50 seconds.
- Pearl Sprint: catch 20, 30 or 40 pearls in 45 seconds, with three-second penalties for tapping urchins.

Each mode awards 75/150/225 pearls and one tool for its three medals. After all medals, replay is practice: it updates best scores without repeating prizes. Timers pause when the tab is hidden and resume only on player input. These are local/player-saved challenges, without live multiplayer or purchases.

If WebGL cannot initialize, the loading screen offers Ocean Arcade directly; these challenges use Canvas 2D and DOM controls.

## Validation

Run `node --test tests/*.cjs` from the repository root. Tests cover board generation, palette/objective compatibility, saves, unlock thresholds, block collisions/rotations/row clears, arcade UI controls, reward caps, match weapons and earlier expedition features. The automated browser available during development has WebGL disabled; 3D visual quality and headset performance need device validation.
