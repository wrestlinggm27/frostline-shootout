# Frostline Shootout — Version 1

A complete, offline-friendly **30-second arcade ice hockey shootout**. Made with original graphics using plain HTML, CSS, and JavaScript. No installation, frameworks, accounts, or third-party assets.

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
- `README.md` — Setup and playing instructions.

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
- You can toggle simple synthesized game sounds at the top right.
- `Play Again` resets the round, timer, shot state, goalie and live stats; your personal best is preserved.

## Technical notes

- Uses Pointer Events with pointer capture for mouse, iOS touch, and Android touch. Touch gestures over the rink cannot accidentally scroll the page.
- An adaptable virtual 420×680 rink keeps the shooting physics consistent across screen sizes; the actual canvas is sized for the device pixel ratio.
- No data leaves your device. Sounds are generated in the browser using the Web Audio API.
- If the page is hidden, the game pauses while it is in the background.

## Possible improvements after playing V1

Shot feel and goalie balance may need tuning based on your feedback. Additional visual/sound polish, animations, and an optional practice mode can follow later, but they are deliberately out of scope for V1.
