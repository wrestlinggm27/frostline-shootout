# Frostline Shootout — Game Design Document (GDD)

> **Document version:** 1.1 (approved design baseline + Showdown concept)  
> **Last updated:** October 14, 2026  
> **Game status:** In development; current playable Stable build V2.19  
> **Target public launch:** Friday, December 4, 2026 (subject to release-readiness checks)  
> **Public launch version:** Frostline Shootout 1.0, Arcade Shootout only  
> **Platforms:** Mobile and desktop web browsers (iPhone, Android, Windows, macOS and other supported browsers)  
> **Business model:** Free browser game; **no microtransactions planned**  
> **Document purpose:** Source of truth for game vision, approved design rules, launch scope and release gates. Implementation and test results are tracked separately.

**Status vocabulary:** **Shipped** = present in Stable; **Approved** = design decision to preserve; **Launch required** = must be verified for 1.0; **Planned** = proposed work not yet complete; **Post-launch** = outside the 1.0 commitment. An approved design is *not* proof of passing real-device testing.

**Links:** [Stable game](https://wrestlinggm27.github.io/frostline-shootout/) · [DEV game](https://wrestlinggm27.github.io/frostline-shootout/dev/) · [Repository](https://github.com/wrestlinggm27/frostline-shootout)

---

## 1. High concept and vision

**Frostline Shootout** is an original, fast-paced hockey arcade game. Players have **30 seconds** to shoot unlimited pucks past a moving goalie, post a high score, and try again. The controls are simple enough for a first-time player and skillful enough to make repeat attempts worthwhile.

**Player fantasy:** Step onto your own personalized rink, wear your own hockey identity and try to beat the buzzer.

**Primary audience:** Hockey fans, arcade players and casual players seeking a short, replayable challenge on a phone or desktop. Players should be able to enjoy a complete session on a coffee break.

**Elevator pitch:** *Thirty seconds. One net. Your game.*

### Five design pillars

1. **Fun before features.** Shooting, saves and goals must feel responsive, legible and fair.
2. **Instant replayability.** A round lasts 30 seconds, with a quick path to another attempt.
3. **Player ownership.** Names, teams, palettes, crests and local records make each player's experience personal.
4. **Accessible arcade play.** Touch and mouse controls should be understandable without lengthy instruction.
5. **Original hockey identity.** The ice, audio and team art create arena atmosphere without using league-owned team logos or uniforms.

**Design test:** A proposed feature belongs in the 1.0 launch only if it materially improves these pillars and does not jeopardize the release schedule.

## 2. Core gameplay loop — Approved / Shipped

1. Open Frostline Shootout.
2. Create or choose a local player profile.
3. Select a team identity or customize it (optional after onboarding).
4. Pick an Arcade difficulty: **Pond Hockey**, **Beer League**, or **The Show**.
5. Start the 30-second round.
6. Aim and release shots to beat the moving goalie.
7. Read goals, shots, saves, misses, shooting percentage, remaining time and personal best.
8. Finish at the buzzer, review results, and select **Play Again** or return to the menu.

**Round constraints:** Exactly 30 seconds of normal Arcade play, unlimited available pucks, and a short per-shot reset/cooldown. There is no stamina system, currency system or purchase loop.

**Success condition:** Score as many goals as possible during the round. Personal improvement and records drive repeat play; there is no single-match victory requirement.

## 3. Controls and puck physics — Shipped; balance review ongoing

### Input

- **Touch:** Place a finger on or near the puck. **Pull backward/downward and release** to shoot; diagonal pulling changes trajectory. **Forward flicking** is an alternative.
- **Desktop:** Click and drag from the puck, then release. Use the same aiming principles as touch.
- A longer/stronger gesture should generally produce a harder shot, within consistent game limits.
- The game should show understandable aim/power feedback before the shot.
- Input coordinates must scale correctly with the compact rink at different display sizes.

### Shot outcomes

Shots can be registered as **GOAL**, **SAVE**, **MISS**, **POST**, or **CROSSBAR**, with appropriate visual/audio feedback. Puck movement, goalie contact, goal-line crossing and scoreboard updates must agree with what the player sees.

**Approved collision rule:** Contact with either visible goalie arm/glove must result in a save. Stable V2.17 corrected a narrow goalie save-zone bug and now calculates the puck's position at the goalie/goal line crossing for better diagonal-shot accuracy.

**Required quality checks:**

- Pull-back and forward-flick shots point in the intended direction.
- Repeating the same gesture produces comparable shot behavior.
- Both glove sides and torso/contact lanes yield credible saves.
- Clear shots around the goalie can still score.
- Fast diagonal shots do not slip through the collision model.
- Posts and crossbar events cannot silently count as goals.
- No phantom saves or goals from obvious misses.
- Touch and mouse play are consistent enough to feel like the same game.

**Open balance questions:** Exact shot-power curve, puck-speed cap, goalie coverage calibration and player score distributions. Resolve from recorded playtests; do not invent target hit rates.

## 4. Goalie AI and difficulty — Shipped; tuning planned

Three difficulties share the same 30-second rules and physical goalie collision expectations:

| Mode | Intent | Player experience |
| --- | --- | --- |
| **Pond Hockey (Easy)** | Approachable | Forgiving movement/reaction; encourages beginners to score |
| **Beer League (Medium)** | Default competitive experience | Fair challenge with learnable goalie behavior |
| **The Show (Hard)** | Arcade mastery | Faster, more demanding, but never unbeatable |

**Behavior:** The goalie patrols and reacts to shots. Repeating the same target should not guarantee automatic scores. Difficulty may ramp during a round through behavior/reaction, not deceptive hit boxes.

**Approved standard:** A visibly struck glove does **not** become a goal just because the player chose a different difficulty. League challenge comes primarily from movement, tracking and reaction behavior.

**Testing:** Compare controlled shooting patterns and complete rounds in all three levels, including both corners, straight shots, power differences and repeated-location attempts. Record goals, shots, unusual events and whether difficulty feels fair.

## 5. Scoring, records and player persistence — Shipped / Protected

**During a round:** Display goals, total shots, saves, misses, shooting percentage, time left and best score. Feedback should be short and readable in an active round.

**After a round:** Present results and offer immediate replay or return to menu.

**Saved locally:** Player names/profiles, selected teams and related customization, difficulty preference and supported best/record-book data. Records remain **per browser/device** unless a future account/sync system is intentionally built; clearing site data may erase local saves.

**Non-negotiable data rule:** Never overwrite, rename or reset Stable storage keys or schemas as an accidental side effect of feature releases. Existing player profiles and records must survive upgrades. Verify legacy save migrations and previously selected branding.

**DEV isolation:** Experimental DEV storage is prefixed `frostline-dev:`; production keys remain unprefixed, including `frostline-player-profiles-v1`. Do not import DEV records into Stable or the reverse.

## 6. Team identity and customization — Approved / Shipped

Identity is a pillar, not an optional skin store. Players can select:

- **32 original fictional city clubs**, arranged across Eastern/Western conferences and Atlantic/Metropolitan/Central/Pacific divisions.
- **8 national teams:** USA, Canada, Sweden, Finland, Czechia, Slovakia, Germany and Switzerland.
- **Custom teams:** editable name, colors and available original crest/brand selections.
- **Goalie Colors:** independent color choice for the opponent, separate from the player's team.
- **Logo Lab:** original branding/crest choices.
- **Local profiles and Record Book:** individual identity and progress.

### Protected design decisions

- The official Frostline main logo is **Ice Cut F (approved Option C)**.
- The eight **redesigned authentic national flag shield designs are fully approved**. Never approximate, replace or redesign them without a new explicit decision.
- Preserve all approved original city-club crests and color identities.
- City-club and national-team display artwork must remain original or used with appropriate licenses; never substitute NHL team logos, federation trademarks or other protected insignia.
- A selected club loads its *full saved name* even if the browsing card shows only the nickname. Card-label editing must not rename a team in stored profiles.
- National-team name, flag/crest and country identity should remain correct. Country customization may create a personal derivative without rewriting the original national design.
- Changes to team and goalie selection are drafts until the player presses **Save**. Cancel must preserve the previously saved choice.
- Selecting a team or goalie palette brings its Save action into view in the relevant long editor.

### Team-gallery presentation standard — Stable V2.19

Each city-club card displays a small **location** followed by a bold **nickname / distinct identity**, without repeating the location unnecessarily. Examples:

| Small location heading | Bold identity | Saved full team name (unchanged) |
| --- | --- | --- |
| Pittsburgh | Gear | Pittsburgh Gear |
| Washington | Fury | Washington Fury |
| Vancouver | Clock Chain | Vancouver Clock Chain |
| Long Island | Island Yes Wave | Island Yes Wave |
| Philadelphia | Bellline | Philly Bellline |

Use **LONG ISLAND**, not “NY ISLANDERS,” for the Islanders-related city-club location. Preserve distinctive place-based identities such as Motor City Octopus and Newark Ironbound.

All names must fit mobile cards without splitting a word in the middle (e.g. **PITTSBURGH**, **WASHINGTON**, **SWITZERLAND**). Wrapping between complete words is acceptable for longer multi-word identities.

## 7. Visual direction and user experience — Approved / Shipped

**Aesthetic:** A polished, compact arcade hockey cabinet with recognizable ice markings, vivid team colors, a moving goalie, fast puck effects, arena energy and Frostline branding. Phones and desktops should feel like the same game, scaled appropriately.

**Visual hierarchy:** The ice and active puck matter most while playing; controls and round metrics stay readable; menus should be large enough to tap and not feel cramped.

### Approved center-ice treatment

1. The **team crest/shield is the visual centerpiece** of the faceoff circle.
2. **City/location** follows a curved upper arc.
3. **Nickname/tradition** follows a curved lower arc.
4. Long identities may use carefully balanced curved rows; avoid unreadably tiny text.
5. Approved crest artwork must not be redesigned by resizing or positioning changes.
6. Current approved crest proportions use a wider horizontal scale (0.78) and vertical scale (0.675), centered on the rink's faceoff circle.
7. National teams show the country and approved authentic flag shield; a nickname is optional when none exists.

**Mobile UI requirements:** All menu controls must remain reachable, text must not clip or split unnaturally, modal scrolling must work, and the main Arcade menu should fill its available space without covering the game or hiding actions. The opening screen owns the large opening slogan; do not duplicate it as a giant Arcade menu headline. Keep mobile-specific alignment fixes isolated where appropriate.

**Usability goal:** First-time players can create a profile, select a difficulty, shoot, view results and replay without live assistance.

## 8. Audio design — Shipped; final asset review required

Current audio concepts:

- Shot/slapshot contact and a brief pull-back cue
- Goal siren plus cheers
- Missed-shot crowd disapproval/boos
- Ambient crowd/arena atmosphere
- Distinct short feedback for goal/save/miss and other shot outcomes as supported

**Requirements:** Clear and promptly triggered effects; audio does not overpower controls; mute/sound-off works; no gameplay dependency on sound; credited/licensed files remain documented. Review current bundled audio credits and licenses before public release. Avoid assuming that an existing file's license automatically covers every future asset.

## 9. Technical architecture and source control — Protected

- **Frontend:** Static HTML, CSS and JavaScript, with canvas-rendered hockey action and original SVG/art.
- **Gameplay coordinates:** A **420 × 680 virtual rink**, scaled responsively to the view.
- **Hosting:** GitHub Pages; no mandatory account, cloud backend or microtransaction system.
- **Offline-friendly:** Game logic can run locally; some recorded sounds may depend on how browser file access is configured.
- **Source repository:** `wrestlinggm27/frostline-shootout`.
- **Stable source:** `main` branch, root `index.html`, `game.js`, `style.css`.
- **DEV working source:** `dev` branch.
- **Playable DEV site:** `main/dev/`, intentionally mirrored from reviewed DEV source so GitHub Pages serves it at `/dev/`. A commit to `dev` alone does not publish the preview.

### Release safety rules (mandatory)

1. All gameplay, UI, content and experimentation begins in **DEV**.
2. Verify changes through automated tests and hands-on review before promotion.
3. **Stable is updated only with explicit approval.** Promote only relevant, reviewed changes, not a blind branch merge.
4. Do not overwrite local player storage, national flag shields, Ice Cut F or other approved art.
5. **Never ship DEV-only diagnostics to Stable:** TEST/RESUME button, frozen timer, draggable goalie, hit-zone overlay, unscored diagnostic shots or diagnostic logic. These are private developer tools, *not* launch features.
6. Maintain production regression tests that fail if DEV-only controls or DEV storage names appear in Stable.
7. Update release/version notes on approved Stable promotions.
8. Keep launch scope separate from longer-term ideas, and check any change against the December 4 target.

**Important:** DEV and Stable preview URLs are both publicly accessible online. “Private developer tools” means *not included in Stable*, not that a publicly hosted DEV URL is access-controlled.

## 10. Frostline Shootout 1.0 scope (December 4 target)

### Launch-required features and experience

- [x] Core 30-second Arcade format implemented
- [x] Three difficulties implemented
- [x] Touch and desktop shot input implemented
- [x] Original clubs, countries, approved team crests, Logo Lab and goalie colors implemented
- [x] Local profiles, preferences and records implemented
- [x] Stable/DEV release separation implemented
- [ ] Shooting/goalie balance audit completed with recorded findings
- [ ] Real-device iPhone, Android and desktop browser checks completed
- [ ] All serious game-blocking, scoring and save-data bugs resolved
- [ ] Audio license/credit and mute behavior review completed
- [ ] First-time-player onboarding and accessibility review completed
- [ ] Closed beta results reviewed and critical feedback addressed
- [ ] Release-candidate automated tests pass
- [ ] Final approved 1.0 build and launch presentation published

Checked items represent *implementation known to exist*; unchecked items require launch verification even if code already supports them.

### Explicitly out of scope for 1.0

Online leaderboards, account/cloud save systems, multiplayer, native app-store builds, microtransactions, additional Arcade styles, two-player shooter-versus-goalie Showdown, and large new customization catalogs. These require separate future approval.

**Launch principle:** Ship **one polished Arcade mode**, not multiple unfinished modes.

## 11. Development schedule and milestones — Planned

| Window | Goal | Exit criterion |
| --- | --- | --- |
| **Oct 13–20** | Shooting, puck collision and goalie gameplay audit | Prioritized findings and agreed fixes |
| **Oct 21–27** | Critical gameplay fixes and polish | Feature-complete Arcade 1.0 candidate |
| **Oct 28–Nov 3** | Mobile/desktop browser and save-data checks | No known serious control or persistence defects |
| **Nov 4–10** | Closed beta, about 10–15 testers | Uncoached player feedback and bug list |
| **Nov 11–17** | Beta fixes, public presentation, screenshots/trailer | Ready-to-share build and page |
| **Nov 18–24** | Soft launch, approximately 20–30 players if feasible | Go/no-go release readiness review |
| **Nov 25–Dec 4** | Release freeze, final tests and official launch | Frostline Shootout 1.0 approved and published |

**Target date:** Friday, **December 4, 2026**. This is a planning commitment, **not an obligation to ship a broken build**. Delays are acceptable for unresolved critical gameplay, crash or data-loss issues.

## 12. Quality assurance, beta and acceptance criteria

### Repeatable gameplay audit

- Test straight, diagonal, short/long pull-back and forward-flick shots.
- Hold the goalie in known locations using **DEV-only** diagnostics when isolating collisions.
- Check both gloves, the body, corners, posts and crossbar.
- Run controlled full rounds at each difficulty; record goal totals, attempts, misses and suspicious contact.
- Compare actual phone touch behavior with desktop mouse behavior.
- Record each defect with device/browser, league, reproduction steps, expected outcome and observed outcome.

### Minimum launch gate

- No reproducible blocking crash, stuck round or inaccessible primary control on supported devices.
- No known save corruption/loss introduced by the release.
- Scoreboard and shot outcomes agree with gameplay.
- Menus and text fit tested mobile and desktop viewport sizes.
- All approved crests and country flags display correctly.
- Gameplay JavaScript syntax, smoke tests and responsive browser-layout tests pass.
- Dedicated regression checks confirm Stable has no DEV diagnostics.
- External beta users can understand how to shoot and replay without coaching.
- A final candidate is explicitly approved.

Automated test success does **not** replace actual touch-device playtesting.

## 13. Launch preparation — Planned

- Confirm the primary public game URL and whether to use a custom domain.
- Prepare launch screenshots and a short gameplay clip with approved branding.
- Write a concise game description and accessible how-to-play instructions.
- Provide an easy bug-report/feedback method and basic support guidance.
- Describe local-only record storage clearly; avoid implying cloud backup.
- Audit visible artwork, audio files, third-party dependencies and notices.
- Consider a browser-playable listing on an indie game platform only after the main game works reliably there.
- Freeze nonessential features during beta and the final release window.

## 14. Post-launch backlog — Not promised for 1.0

Potential future projects, subject to real-player demand and separate scoping:

1. Extra Arcade challenges, stats and quality-of-life improvements.
2. **Showdown** mode: two human players compete head-to-head, with **one player shooting pucks and the other directly controlling the goalie and defending the net**. See the approved concept below.
3. Optional online leaderboards and account/sync features.
4. Multiplayer and additional competitive modes.
5. Native mobile packaging/app-store distribution only if the browser game earns that investment.

### Showdown: two-player shooter versus human goalie — Approved future concept

**Approved player roles:** Two real players participate in the same matchup. **One controls the shooter**, aiming and firing pucks; **the other controls the goalie**, positioning and actively making saves. Unlike Classic Arcade, Showdown is **not** two shooters separately taking turns against an automated goalie.

**Design intent:** Build direct competition around the existing puck-shooting and save/collision feel. Goalie control must reward human skill and offer fair counterplay; neither player should win through invisible collision rules or an impossible movement advantage.

**Unresolved design decisions (do not treat as approved):**

- Whether each person plays on a **separate device** (online real-time connection) or whether a local/two-controller prototype comes first.
- Whether players **swap shooter/goalie roles**, after how many shots or rounds, and how the winner is determined.
- Exact match length, shot limits, scoring, goalie movement/control layout and tie-breaking.
- Networking/latency requirements if using real-time online play.
- Whether a separate single-player **Goalie Mode** serves as a tutorial before Showdown.

**Scope:** This is a **post-1.0 expansion**. Planning this mode does **not** change the December 4, 2026 Arcade-only release target or authorize gameplay code changes.

Avoid dates or commitments for these until their complexity and player value are verified.

## 15. Risks, unresolved decisions and change control

| Risk / decision | Current approach |
| --- | --- |
| Goalie becomes unfair after physical collision fixes | Playtest all three leagues and tune behavior instead of removing visible-contact saves |
| Mobile text clips at narrow sizes | Whole-word wrapping and responsive layout regression tests |
| Existing records vanish after update | Preserve production storage keys and test upgrades/Cancel behavior |
| Approved flag/crest art is accidentally changed | Treat artwork as locked; verify SVG/vector regression checks |
| DEV diagnostic UI leaks into Stable | Isolated promotion and automated source guard |
| Team customization becomes endless feature creep | Freeze 1.0 catalog; move expansion ideas post-launch |
| Browser/device differences | Test real phones and desktop browsers before go/no-go |
| Asset/licensing questions | Resolve before launch with credits and source documentation |
| Unsustainable schedule | Prioritize serious defects; defer optional features; postpone if necessary |

**Open for later approval:** Final goalie/shot balance targets, smallest supported viewport, accessibility checklist, public bug-report path, whether to buy a custom domain, launch storefront/listing strategy and post-launch priorities.

### Design-change protocol

For every meaningful future design request:

1. State the player problem and proposed change.
2. Mark whether it affects launch scope, game balance, art, saved data, or DEV/Stable boundaries.
3. Change and test **DEV only** unless the user explicitly approves a different action.
4. Review screenshots/gameplay and tests.
5. Ask for explicit Stable approval.
6. Promote only the approved files/logic and run production checks.
7. Record the decision and date in the appropriate GDD section or change log.

## 16. Document ownership, maintenance and version history

This file is the approved **design foundation**. It records intended game behavior and launch commitments, not a substitute for the live codebase, test results or bug tracker.

- **Design decisions:** Update this GDD after approval.
- **Working tasks and defects:** Track separately in a launch backlog or GitHub issues.
- **Code/build details:** Use code, tests and `README.md` as implementation reference.
- **Release history:** Continue documenting Stable promotions in `README.md` and release notes.
- **Versioning:** GDD versions are *document versions* and do not imply the game itself has launched as version 1.0.

### GDD change log

| Date | GDD version | Change |
| --- | --- | --- |
| **2026-10-14** | **1.0** | Initial approved Frostline game-design baseline; Arcade-only December 4 target, protected customization/art/records, separate DEV/Stable rules, launch gates and future backlog |
| **2026-10-14** | **1.1** | Approved Showdown concept: a human shooter plays directly against a human-controlled goalie; match format and local/online implementation remain open |

---

**Guiding principle:** **Protect what works. Fix what affects play. Finish and release Frostline Shootout 1.0 before expanding the game.**
