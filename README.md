# Frostline Shootout — Stable Version 2.10

## Stable V2.10: Eight Accurate National Flag Teams

The approved National Teams feature has joined the full 32-club Stable gallery. Team setup now offers a compact City Clubs selector (32 original fictional clubs), a separate expandable **National Teams** selector (USA, Canada, Sweden, Finland, Czechia, Slovakia, Germany, Switzerland), and fully custom team name, colors and shield. The country is selected with its real national name and colors, and saving a country keeps a mutually exclusive `nation` identity in the player profile. Customizing that country creates a unique derivative without replacing its visual flag crest unless the player chooses new art.

For the user's approved redesign, all eight country shields now display **authentic vector national flag symbols** drawn with clipped geometry, both in the picker and on center ice. The USA includes 13 stripes and 50 stars; Canada retains its maple leaf; Slovakia retains its full double-cross and three-hill emblem. Artwork adapts [flag-icons](https://github.com/lipis/flag-icons) under the MIT license, included in `FLAG-ART-LICENSE.txt`, and no licensed federation emblems are copied.

**Player saves remain intact.** Production continues to use the original unprefixed `frostline-player-profiles-v1`, difficulty and high-score keys; the official **Ice Cut F** brand logo (including its one-time migration) remains the default. DEV saves remain isolated under `frostline-dev:` and are neither copied nor modified.

## Stable V2.8.1: Official Ice Cut F Logo

The official Frostline brand logo is **Option C — Ice Cut F**. New player profiles now use that logo by default, and existing V2.8 profiles with the automatically assigned Power Play logo are migrated to Ice Cut once. The Logo Lab continues to allow player-selected logos afterward without overriding their selection at a later visit.

This small branding fix preserves Stable player names, team choices and hockey records and does not read, copy, or change any DEV player data. The full 32-city-team collection remains in place.

## Stable V2.8: Complete 32-Team City Collection

**Promoted from the fully tested DEV V2.8 build.** All 32 fictional, original city-inspired hockey teams are available in an expandable, collapsible team picker. The city clubs are organized into Eastern and Western conferences, with eight clubs in each of the Atlantic, Metropolitan, Central and Pacific divisions. Players can also select six generic hockey shields and three original F brand logos.

**Existing players are preserved.** Stable still uses the original unprefixed storage keys: `frostline-player-profiles-v1`, `frostline-shootout-difficulty-v1`, and legacy high-score keys. Saved names, colors, difficulties, and record books from V1.7.1 remain accessible; older teams receive the default crest when one has not been chosen. The DEV preview continues to use separate `frostline-dev:` storage and is not imported into Stable.

All logos are original fictional artwork inspired by arena rituals, not copied NHL insignia.

## Stable and Development environments

Frostline now has two independently playable sites, with the **same compact arcade interface**:

| Environment | Website | Development source | Purpose |
|---|---|---|---|
| Stable V2.10 | [Play Stable](https://wrestlinggm27.github.io/frostline-shootout/) | [main branch](https://github.com/wrestlinggm27/frostline-shootout/tree/main) | Reliable game; keep this build unchanged while features are tested |
| Development | [Play DEV](https://wrestlinggm27.github.io/frostline-shootout/dev/) | [dev branch](https://github.com/wrestlinggm27/frostline-shootout/tree/dev) | Experimental improvements; may be unstable |

**Release process:**
1. Make new game changes **only to the `dev` branch**.
2. Run the automated quality tests for the dev branch.
3. Preview the updated build by mirroring the development files to the separate `/dev/` site directory. The `main` branch's root gameplay files must **not** be changed during this preview process.
4. Review and play-test the development URL. Only after approval, carefully promote tested game files into Stable and update the version/README.
5. Keep Stable player data and Dev player data independent: the development JavaScript prefixes its browser storage keys with `frostline-dev:`.

**Important limitations:** Both preview URLs are publicly viewable. Development preview mirroring is intentionally an explicit approval/review step, not an automatic Stable deployment. GitHub Pages publishes the Stable root plus its `dev/` directory from the `main` branch. The preview does **not** auto-update merely because someone commits to the `dev` source branch. Do not use the DEV preview as a permanent home for personal records.



A complete, offline-friendly **30-second arcade ice hockey shootout**. Made with original graphics using plain HTML, CSS, and JavaScript. No installation, frameworks, or accounts. Crowd recordings are licensed and credited below.

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

## Stable logo selection (V1.7.1)

Approved **Ice Cut F (Logo Lab option C)** as the official Frostline header mark. The top-left arcade badge keeps its original red/blue glow, shield and slant, while the old three diagonal strokes have been replaced with an original angular two-bar **F**, implemented as an inline SVG. There is **no Logo Lab selector in Stable**.

Only the Stable header logo, its related CSS and this README were updated. Gameplay, sound, player profiles, team customization, local records and the separate DEV site stay the same. The Logo Lab and other experiments remain in the DEV branch and `/dev/` preview.

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
