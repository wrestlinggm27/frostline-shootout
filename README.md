# Frostline Shootout — DEV V1.9: Team Crest Studio

> **Development copy.** All new features are tested here before being approved for Stable. Dev player names, teams and records are stored under separate browser keys. Stable remains unchanged.

A complete, offline-friendly **30-second arcade ice hockey shootout**. Made with original graphics using plain HTML, CSS, and JavaScript. No installation, frameworks, or accounts. Crowd recordings are licensed and credited below.

## Stable vs Development

- [Stable game](https://wrestlinggm27.github.io/frostline-shootout/) — approved version played by everyone.
- [Development preview](https://wrestlinggm27.github.io/frostline-shootout/dev/) — experiments and features under review; may contain bugs.
- [Development source branch](https://github.com/wrestlinggm27/frostline-shootout/tree/dev) — edit here, validate, then promote intentionally.

Use separate profiles in the dev preview. Both pages share the same host but the development game adds a prefix to its browser storage keys to avoid changing stable records.

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
