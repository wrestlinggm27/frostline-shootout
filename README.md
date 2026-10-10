# Frostline Shootout — Version 1.3

A complete, offline-friendly **30-second arcade ice hockey shootout**. Made with original graphics using plain HTML, CSS, and JavaScript. No installation, frameworks, or accounts. Crowd recordings are licensed and credited below.

## How to play

1. Open **`index.html`** in Chrome, Edge, Safari, or Firefox.
2. Press **Start Game**.
3. Touch or click **on or near the puck** near the bottom of the ice.
4. **Pull back (down) to aim, then release**, like a slingshot. Dragging diagonally makes the puck travel diagonally. A longer pull gives a harder, faster shot.
5. Or **flick forward (up) directly from the puck**. A fast, long flick adds speed.
6. Aim between the red goalposts. The moving goalie reacts to shots, especially repeated attempts in the same corner. Get as many goals as possible before time runs out.

You can see your aim and power while dragging. There are unlimited pucks, but only 30 seconds! Shots may score, be saved, miss wide, ring a post, or hit the crossbar.

## Files

- `index.html` — Game page, scoreboard, start and results screens.
- `style.css` — Responsive layout and arcade styling.
- `game.js` — Controls, shot trajectory, goalie AI, collision detection, timer, sound, original Canvas art.
- `assets/crowd-cheer.mp3` — Real stadium cheering, licensed from Pixabay.
- `assets/crowd-groan.wav` — Real crowd disappointment, CC0.
- `README.md` — Setup and playing instructions and asset credits.

## Running it

**Easiest:** Extract the ZIP, then double-click `index.html`. It works locally without internet or a server.

**Optional local web server:** From inside the folder, run:

```bash
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

**Playing on a phone:** Put the same files on any simple static web host (for example GitHub Pages) and open that link in your mobile browser. If you want to test from a phone on the same Wi-Fi network as a computer, run a local server on the computer, allow access through the firewall if needed, and visit the computer's LAN IP and port from the phone.

## Game rules and statistics

- Timer starts at **30.0 seconds**; a shot already in flight when time expires can finish.
- **Goals:** successful shots in the net.
- **Shots:** every valid released shot.
- **Saves:** stopped by the goalie.
- **Misses:** shots wide, off the post, or off the crossbar.
- **Shoot %:** goals divided by shots, rounded to the nearest percent.
- **Best:** highest goals scored in any single round, saved in this browser's `localStorage` (separate per browser/device).
- You can toggle arena sounds at the top right. Stick effects and goal horn are synthesized; cheering and crowd disappointment use recorded audio.
- `Play Again` resets the round, timer, shot state, goalie and live stats; your personal best is preserved.

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
