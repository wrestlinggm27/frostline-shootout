# Frostline Shootout — DEV V2.5: Twenty City Teams

> **Development copy.** All new features are tested here before being approved for Stable. Dev player names, teams and records are stored under separate browser keys. Stable remains unchanged.

A complete, offline-friendly **30-second arcade ice hockey shootout**. Made with original graphics using plain HTML, CSS, and JavaScript. No installation, frameworks, or accounts. Crowd recordings are licensed and credited below.

## Stable vs Development

- [Stable game](https://wrestlinggm27.github.io/frostline-shootout/) — approved version played by everyone.
- [Development preview](https://wrestlinggm27.github.io/frostline-shootout/dev/) — experiments and features under review; may contain bugs.
- [Development source branch](https://github.com/wrestlinggm27/frostline-shootout/tree/dev) — edit here, validate, then promote intentionally.

Use separate profiles in the dev preview. Both pages share the same host but the development game adds a prefix to its browser storage keys to avoid changing stable records.

## City Club Batch Five — DEV V2.5

The city club roster now includes **20 original fictional teams**, with the new batch using the same custom SVG crest format and per-player saved team palettes:

| Region | Fictional team name | Inspiration | Original colors |
|---|---|---|---|
| Buffalo | **Buffalo Blade Gang** | Hockey fans' Blade Gang ritual, shown as crossed skate blades with a puck and rally halo | Royal blue `#003087`, gold `#ffb81c`, white |
| Ottawa | **Ottawa Legion** | Roman-inspired helmet and swept crest, not copied from an official team mark | Black `#151515`, red `#c52032`, gold `#c2912c` |
| Columbus | **Columbus Cannonfire** | Cannon firing celebration, broad barrel, spoked wheel and blast lines | Navy `#002654`, red `#ce1126`, white and silver `#b5c1d0` |
| New Jersey (Newark) | **Newark Ironbound** | Newark's industrial ironwork and bridge shapes with a skyline | Red `#ce1126`, black `#151515`, white |

The expanded DEV team editor keeps the **city teams collapsed by default** so the menu stays short, and the selected name displays in the collapsed header. No changes were made to Stable, player storage format, or gameplay.

## Compact City Club Picker — DEV V2.4

**Customize Team** now begins with the **Frostline City Clubs** gallery collapsed. Its accessible **EXPAND** control reveals all 20 city-team cards; the same control changes to **COLLAPSE** and hides them again. The collapsed header shows the current city selection if one is active. Each time the player reopens the team editor, the catalog starts compact, while color themes, custom team names and generic crests remain immediately accessible.

This uses a native HTML `details` / `summary` disclosure (no new dependencies) with keyboard focus styles and phone-sized layouts. Existing profiles and team-selection data remain unchanged, and the game stays separate from Stable.

## City clubs — fourth batch (DEV V2.3)

Four additional *original fictional city identities* based on hockey fan traditions bring the DEV team roster to **16 city clubs**, alongside six generic crests. Names, shields and symbols are original; palettes reflect familiar hockey-market colors without including any official team marks.

| City | Original team | Fan tradition / new icon | Team colors |
|---|---|---|---|
| Carolina | **Carolina Warning** | A dome-shaped hurricane-warning siren and spinning alert waves | Red `#cc0000`, black `#111111`, white |
| Florida | **Florida Blue Rat** | Navy blue rally rat with pointed ears, golden eyes/nose and curled tail | Red `#c8102e`, navy `#041e42`, white with gold `#b9975b` artwork details |
| Tampa Bay | **Tampa Coil** | An induction-coil tower and forked electrical arcs, inspired by the arena's Tesla coil intro | Royal blue `#002868`, midnight `#101820`, white |
| Dallas | **Dallas Brimline** | Wide-brimmed western cowboy hat and subtle star on a silver/green crest | Green `#006847`, black `#111111`, silver `#c4ced4` |

The **Dallas Brimline** fictional team name avoids shipping the real-world *Stetson* brand name while delivering the requested cowboy-hat design. All four team crests work with the gallery preview, center-ice rendering, per-player DEV persistence, and Save/Cancel behavior. Stable files remain untouched.

## City clubs — third batch (DEV V2.2)

Four additional **fictional, original team identities** based on their cities' distinct culture bring the DEV roster to **12 city clubs**. The team palette draws on familiar local professional hockey colors, while all marks and club names are independently drawn and not official licensed symbols.

| City | Fictional club | Original concept | Primary / secondary / trim |
|---|---|---|---|
| Philadelphia | **Philly Bellline** | A swinging civic bell with rink details and a puck-shaped clapper | Orange `#f74902`, black `#000000`, white |
| Minnesota | **Minnesota Northwoods** | An evergreen, north star and lake ripples | Forest green `#154734`, red `#a6192e`, wheat `#ddcba4` |
| Nashville | **Nashville Riff** | Guitar neck transformed into a hockey-stick blade, plus sound bars | Gold `#ffb81c`, navy `#041e42`, white |
| Seattle | **Seattle Rainline** | Rain, a waterside lookout and breaking coastal waves | Deep navy `#001628`, ice blue `#99d9d9`, white |

All new teams use the same SVG and rink-rendering system, color customization, Save/Cancel behavior, and browser-only DEV player profiles as prior batches. The six generic crests and earlier eight city clubs remain. Future head-to-head play is not implemented. Stable V1.7.1 remains unchanged.

## City clubs — second batch (DEV V2.1)

Four more fictional city-inspired hockey identities join the existing first four, with **original vector artwork**, saved team colors and optional city-club IDs. No official NHL names, emblems, or copyrighted artwork are embedded.

| City | Original club | Fan/city inspiration | Palette |
|---|---|---|---|
| Boston | **Boston Banner** | The fans' rally banner, with an original letter B and a banner pole | Black `#101010`, gold `#ffb81c`, white |
| Toronto | **Toronto Grind** | “No Grit, No Grind, No Greatness,” pictured as a hard-edged forged G and sharpening slashes | Blue `#00205b`, white |
| Montreal | **Montreal Olé** | Arena Olé chant, represented by an original M and outgoing acoustic arcs | Red `#af1e2d`, blue `#192168`, white |
| Pittsburgh | **Pittsburgh Gear** | Black-and-gold equipment and jerseys, shown as an industrial gear enclosing a small jersey | Black `#111111`, gold `#fcb514`, white |

The DEV Customize Team dialog now offers **eight city clubs total**, followed by the same editable team name, quick color themes and six generic shields. Selecting a city club loads its name, crest and colors. Editing the name/colors creates a custom team based on that crest without overwriting the original club data. The player's selected team persists in DEV browser storage only; it shows in the header and at center ice.

This batch adds no multiplayer, accounts, uploads, or monetization. Stable remains V1.7.1. Browser regression tests check all eight choices on desktop and mobile screens.

## The first four city clubs — DEV V2.0

Players may choose one of four **fictional city-inspired hockey clubs** from **Customize Team → Frostline City Clubs**. Each club has a new original vector emblem, a team name, and a city-inspired professional hockey color palette. No official NHL logos, names, or reproduced team marks ship with the game.

| City | Fictional club name | Inspiration | Primary / secondary / trim |
|---|---|---|---|
| New York | **Empire Salute** | Two raised hockey sticks framing a skyscraper skyline, inspired by center-ice stick salutes | Royal blue `#0038a8`, red `#ce1126`, white |
| Detroit | **Motor City Octopus** | A playful octopus with curling tentacles and expressive face | Red `#ce1126`, white |
| Chicago | **Chicago Curve** | A large forward-sweeping curved stick blade with original star details | Black `#121318`, red `#cf0a2c`, cream `#f4e9d8` |
| Calgary | **Prairie Fire** | A bold ring of gold flames surrounding a hockey puck | Red `#c8102e`, gold `#f1be48`, white |

Select any club to load its name, palette and crest into the **live team preview**. The existing name field, color pickers and six original generic shields remain usable. **Save My Team** persists a team identity including its optional `club` id and `crest` id in the current DEV browser profile; changing the name or colors clears the club affiliation but preserves the chosen original graphic.

The identity appears in the header and on center ice, and remains a single serializable object for potential future player matchups. Head-to-head goalie control, online multiplayer, and shared uploads are **not implemented**. Stable V1.7.1 stays unchanged.

## Team Crest Studio — DEV V1.9

The **Customize Team** screen now includes six completely original team shield emblems: **Captain (initials), Wolf, Lightning, Crossed Sticks, Star, and Summit**. Pick a shield as part of your existing team name and three-color customization.

- Each shield uses the selected primary, secondary, and trim colors, with a live preview alongside the team name and quick-theme presets.
- The chosen emblem appears **beside the team name in the game header** and **on center ice** during Arcade Shootout. It remains decorative and does not change shooting, scoring, difficulty, or audio.
- Both existing DEV profiles and new players get a valid default Captain crest; choosing a different crest stores its identifier in the player's existing `team` profile object alongside name and colors. The whole identity is intentionally portable for a future head-to-head matchup display.
- Choosing a shield updates the preview only until **Save My Team** is selected. **Cancel** restores the previous saved identity. Each local DEV player can save a separate shield.
- The icons and shield shapes are rendered from our original vector geometry, no NHL/team licensing or external art needed.
- **Head-to-head/showdowns and goalie-controlled multiplayer are future ideas only**, not implemented in V1.9.
- Stable V1.7.1 stays unchanged. Development profiles continue using separate `frostline-dev:` browser storage.

## F Logo Lab — Development experiment (V1.8)

This build adds three **original vector logos for the Frostline brand badge**, all preserving the red-and-blue glowing shield outline while replacing the old three-slash emblem with a recognizable, **two-bar F**:

- **A · Power Play** — classic, bold F with a strong vertical spine and a long top/short middle bar.
- **B · Speed Rush** — aggressive forward-swept angles and sharp slanted edges.
- **C · Ice Cut** — a chunky F with angular cuts/notches.

On the DEV game, choose **Logo Lab** on the start/replay menu or click the top-left badge. Click a logo to preview it live on the header, then click **Save Logo** or **Cancel**. Choices persist with the current **DEV player profile** and follow the player when switching profiles; cancel and Escape restore the previous saved choice.

**Stable V1.7 remains untouched.** The designs are prototypes for choosing one final Frostline logo; this does not edit the customizable team crest, goalie mechanics, sound, or player records. The logo's original artwork is defined as inline SVG symbols in `index.html` and styled in `style.css`, with selection and persistence in `game.js`.

## How to play

1. Open [Frostline Shootout](https://wrestlinggm27.github.io/frostline-shootout/) or `index.html` in Chrome, Edge, Safari, or Firefox.
2. On your **first visit**, enter a player name (2–18 characters) and continue into the **Build Your Team** screen. Choose team colors and a name, or keep the default team.
3. In the **Arcade Shootout** menu, choose Pond Hockey, Beer League or The Show, then select **Start Game**.
4. Touch or click **on or near the puck** near the bottom of the ice.
5. **Pull back (down) to aim, then release**, like a slingshot. Dragging diagonally makes the puck travel diagonally. A longer pull gives a harder, faster shot.
6. Or **flick forward (up) directly from the puck**. A fast, long flick adds speed.
7. Aim between the red goalposts. The moving goalie reacts to shots, especially repeated attempts in the same corner. Get as many goals as possible before time runs out.

You can see your aim and power while dragging. There are unlimited pucks, but only 30 seconds! Shots may score, be saved, miss wide, ring a post, or hit the crossbar.

## Files

- `index.html` — Game page, scoreboard, player onboarding, record book, start/results screens, and Customize Team dialog.
- `style.css` — Responsive layout, team theme variables and arcade styling.
- `game.js` — Controls, goalie AI, collision detection, timer, sound, player profiles, per-mode records, customizable teams and Canvas art.
- `assets/crowd-cheer.mp3` — Real stadium cheering, licensed from Pixabay.
- `assets/crowd-groan.wav` — Real crowd disappointment, CC0.
- `README.md` — Setup and playing instructions and asset credits.

## Running it

**Easiest online:** play at [Frostline Shootout](https://wrestlinggm27.github.io/frostline-shootout/) on phone or desktop.

**Offline/local:** double-click `index.html` to play without installing anything. Because some browsers block `fetch` on `file://` pages, recorded crowd sounds might fall back to synthesized sounds; use the local web server below to enable those recordings.

**Optional local web server:** From inside the folder, run:

```bash
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

**Playing on a phone:** Put the same files on any simple static web host (for example GitHub Pages) and open that link in your mobile browser. If you want to test from a phone on the same Wi-Fi network as a computer, run a local server on the computer, allow access through the firewall if needed, and visit the computer's LAN IP and port from the phone.

## Compact arcade layout (V1.7)

The shootout is intentionally presented as the **same narrow, vertical arcade cabinet** on both desktop and mobile. This is the game's visual identity, not a temporary mobile layout. Game physics and 30-second Arcade Shootout gameplay are unchanged.

- Welcome and post-round overlays fit the **available rink size**, including when a desktop browser window is short. They do not expand to fill a widescreen monitor.
- Results prioritize the final score, difficulty picker, team/records actions and Play Again. Decorative elements and redundant text are hidden on the result screen.
- The three results stat tiles are fluid columns rather than fixed-width tiles; long captions and menu buttons cannot force horizontal scrolling.
- Styles use **rink container queries**, not device detection, so compact desktop and phone cabinets get the same design rules.
- Browser layout tests validate desktop and mobile sizes. Separate smoke tests cover player profiles, shooting and records.

## Player onboarding, arcade mode and the record book (V1.6)

The first time a browser opens the game, **Who’s Hitting the Ice?** requests a local **player name** (2–18 characters). After entering the name, the player is taken directly into **Build Your Team** to choose a team name, themed presets and three colors. Saving or selecting **Keep This Team** returns to the game’s menu.

- **Arcade Shootout** is the existing 30-second hockey shootout. The game explicitly labels it as a mode so **additional game styles can be introduced later without replacing it**. Other modes are not implemented yet.
- Names are local **profile identifiers**, **not account sign-ins** or globally unique usernames. No password, server account, telemetry or purchase is required.
- **Record Book** in the Arcade menu shows the active player’s personal best, rounds played, and total goals in Pond Hockey, Beer League and The Show.
- Records are stored per player **and per league under Arcade**, reserving room for future game modes in the data structure.
- **Switch** in the menu lets people on the same browser choose an existing local player or create a new one. Their teams, selected league and records remain separate.
- The game reopens as the **last active player** on the same device and browser; it doesn't ask for a username every time.
- On the first new player created after upgrading from earlier versions, the existing team, chosen league and best scores are carried over. The existing pre-difficulty record is attributed to **The Show**.
- Profiles and records use the browser’s **localStorage**, which can be cleared by private browsing, clearing site data or browser changes. They **do not sync** between devices and are **not online leaderboards**.
- **No microtransactions, advertisements or paid upgrades** are part of this game.

## Customize your team (V1.5)

Frostline starts with **Broadway Blues**, an original fictional team using a **royal blue, red and white** palette inspired by New York hockey. There are no official NHL logos, uniforms or team graphics.

Before a round, click **Customize Team** (also available on the Play Again screen). You can:

- Give your team any name, up to **24 characters**.
- Pick one of four original themes: **Broadway Blues**, **Icebreakers**, **Aurora**, or **Black Ice**.
- Change the **primary**, **secondary**, and **trim** colors individually with browser color pickers.
- Preview a simple team crest with your initials, then choose **Save My Team**, or cancel without applying changes.
- See your colors across the game chrome, scoreboard, shot aiming guide and center-ice crest.

Each player profile keeps its own team in **browser localStorage**. Different people can use separate player profiles on one device, or independently customize the same web address on their own devices. Profiles do not sync across devices; goalie difficulty and records stay separate from team colors.

## Goalie difficulty: choose your league

- **Pond Hockey (Easy):** goalie has slower reflexes, shorter reach, less predictive movement and occasional positional mistakes. Great for more goals and getting comfortable with the controls.
- **Beer League (Medium):** competitive goalie with moderate speed and shot-reading ability.
- **The Show (Hard):** original V1-V1.3 NHL-level challenge, including quick reads, stronger positioning and wider save range.
- All three goalies **improve gradually during each 30-second round**. The more you repeatedly aim at one spot, the more each goalie starts expecting it (especially in The Show).
- Choose or switch leagues on the **Start Game / Play Again** screen. The game remembers your last selected league.
- High scores are **separate for each league**. Existing V1-V1.3 high scores belong to The Show, so they are not lost or mixed into easy-mode records.

## Game rules and statistics

- Timer starts at **30.0 seconds**; a shot already in flight when time expires can finish.
- **Goals:** successful shots in the net.
- **Shots:** every valid released shot.
- **Saves:** stopped by the goalie.
- **Misses:** shots wide, off the post, or off the crossbar.
- **Shoot %:** goals divided by shots, rounded to the nearest percent.
- **Best:** highest goals in a 30-second round **for the active player, Arcade Shootout mode, and selected difficulty**, saved in this browser's `localStorage`. Legacy high scores are migrated to the first created player, including the old hard-goalie score under **The Show**.
- You can toggle arena sounds at the top right. Stick effects and goal horn are synthesized; cheering and crowd disappointment use recorded audio.
- `Play Again` resets the round, timer, shot state, goalie and live stats; your personal best is preserved. You can select a different difficulty before starting the next round.

## Technical notes

- Uses Pointer Events with pointer capture for mouse, iOS touch, and Android touch. Touch gestures over the rink cannot accidentally scroll the page.
- An adaptable virtual 420×680 rink keeps the shooting physics consistent across screen sizes; the actual canvas is sized for the device pixel ratio.
- There are no analytics, accounts, or gameplay uploads. Audio is handled by the Web Audio API; two licensed crowd recordings ship with the project.
- If the page is hidden, the game pauses while it is in the background.

## Possible improvements after playing V1

Shot feel and goalie balance may need tuning based on your feedback. Additional visual/sound polish, animations, and an optional practice mode can follow later, but they are deliberately out of scope for V1.

## Recorded crowd sound credits (Version 1.3)

- **Stadium cheer:** “Crowd Cheering in Stadium” by **vishiv**, available via [Pixabay](https://pixabay.com/sound-effects/people-crowd-cheering-in-stadium-435357/), distributed under the [Pixabay Content License](https://pixabay.com/service/license-summary/). Game file adapted from the documented web-optimized version in [opstiger/aiba-percent-battle](https://github.com/opstiger/aiba-percent-battle/blob/main/assets/aiba-audio/SOURCE.md). Used as part of gameplay, not as a standalone sound library.
- **Miss/disappointment crowd:** A short cut of “Crowd Ouch.wav” by **deleted_user_2104797**, from [Freesound](https://freesound.org/people/deleted_user_2104797/sounds/324897/), under **Creative Commons Zero (CC0)**. The game uses a wave clip (`crowdOoo3.wav`) already prepared in [kyperbelt/GGJ2024](https://github.com/kyperbelt/GGJ2024). 

The procedural audio engine remains the fallback for devices that cannot load the recordings. All graphics are original; no NHL recordings or logos are used.
