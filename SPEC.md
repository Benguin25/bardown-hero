# SPEC.md

## Game

## Current playable scope (September 2026)

Gameplay feel update:

- Passes travel at 24-29 rink units/second before Fire Puck, up from 23-28. The opening skate takes 0.92 seconds; the rebound route takes 0.58 simulation seconds (about 1.38 seconds with its retained slow motion). The three-second objective countdown and immediate input freeze after reception are preserved.
- Lead reception uses slightly wider stick reach and faster pursuit, with only the existing tiny endpoint assist. Puck coast drag is 13 units/second squared and boards retain 88% of speed, keeping the rebound lively. Bank approaches hold formation until impact, but actual contact can still collect the incoming puck.
- Mega Curve still amplifies bends 1.8 times; its baseline and final-quarter pass assistance now follow stroke distance instead of touch-sample index, reducing sensitivity to uneven finger sampling.
- Receivers keep their selected pickup lane; loose-puck replans retain reachable intercepts instead of always chasing the coast endpoint. Defender pressure changes only when another defender is clearly nearer, predicts at most 2.4 rink units ahead, and requires contact within 0.6 rink units. Movement substeps are capped at 1/120 second, with shorter steps for swept collision checks.
- Goal-mouth slow motion applies only to shots and their resulting rebound; deep passes retain full speed. Pass receivers commit to the first reachable interception point, so they skate ahead to meet the puck instead of matching its movement along the path. Missed passes still become live loose pucks and draw a natural chase.
- Corner aiming has a wider, distinct capture area on the upright goal face (0.95 horizontal / 0.8 vertical rink units around each target). Center aim remains free; clearly wide and high shots still miss.
- Skater headings turn smoothly along the shortest angle, with time-based damping across phone frame rates. Decision pauses still freeze the scene.
- Campaign regression coverage replays all sixteen authored three-star routes at 120, 60, 30, and 20 fps, including banks, leads, rebounds, and powerup decisions. Device touch/GL feel still requires a physical-phone playtest.

Audio update:

- Expo Audio provides original local PCM WAV effects and a looping upbeat stadium-electronic instrumental. Events cover taps, releases, collections, board contact, saves, goals, failures, powerups, countdown, and start.
- A persistent SND ON/OFF control is available in campaign and gameplay. Audio is foreground-only, stops on backgrounding, resumes music on return, and is configured to play through the iOS silent switch. Goal horn temporarily ducks music.

Puck pursuit and onboarding update:

- One nearby attacking skater pursues the pass or loose puck; a nearby defender pressures its current travel direction and keeps that role until another defender is clearly nearer. Supporting skaters retain formation and shade toward the play. Defenders skate at 4.8 units/second (previously 4) and supporting coverage closes passing lanes.
- Loose passes never expire. Skaters keep pursuing stopped pucks, route around the cage, and collect at actual stick reach. The original passer can recover a loose puck without advancing the play or earning pass objectives. Opponent collection still ends the run. Freeze still stops defender movement while preserving collisions.
- First launch presents How to Play with a four-lesson interactive tutorial. The campaign keeps a How to Play button for replay. Lessons cover anchored swipes, curved passes, loose-puck races, and corner shots; tutorial runs never write campaign stars or unlocks.

Board-bank and presentation update:

- Draw toward either side or end board. The preview stops at first contact, with no reflected path. Release executes that approach, then reflects the incoming velocity at the board with arcade speed retention. Drawing beyond the first collision cannot steer the rebound. The puck coasts and teammates attempt normal pickups after impact.
- End-board passes may travel beside the goal but cannot pass through its cage. Ordinary shots keep their save/goal/miss rules.
- Slightly lower camera; both end boards remain framed before aiming. Net uses round posts, a tapered rear frame, and roof/side/back mesh. The goalie has a padded blocker and a catching glove with a laced pocket, without changing save zones.
- Every level start and retry shows its three objectives during a three-second countdown. Gameplay starts afterward; backgrounding pauses the countdown through the existing active-app loop.

The current request supersedes the original vertical-slice exclusions below.

- Sixteen authored portrait levels, grouped into four campaign chapters. Six new highlights cover lead retrieval, board assists, multiple receiver options, cross-ice combinations, rebounds, screened curved shots, and a four-touch finale. Intended routes take 2–4 decisions, with guided rebounds where authored.
- Campaign cards show distinct cleared/current/locked states, short objectives, and best-run stars. Continue selects the next uncompleted unlocked level. Totals use all 48 available stars, with the original ten level indices and save schema preserved.
- Gameplay uses a single compact navigation row, play-progress pips, a fading instruction strip, and an optional objectives sheet. The intro is a compact 3–2–1 overlay; results use staggered star animation and prominent next/retry actions. Existing dark/teal/yellow branding is retained.
- Local haptics accompany taps, collected passes, board contact, goals, and failure. UI motion respects the system reduced-motion preference. Unsupported haptics do not block gameplay.
- New bank/lead stars require actual bank-pass collection and at least 1.25 rink units of receiver movement during a successful pass. No new input mode, AI system, currency, or progression gate.
- Completing a level unlocks its successor, regardless of stars. World/league star thresholds are deferred.
- Each level has three objectives. Results show the current run; the menu retains the best single successful run. Objectives never accumulate across runs, including tied two-star results.
- Local AsyncStorage persistence only. Save writes are serialized and failures shown with a retry action. Failed loading does not silently overwrite existing progress.
- Contextual buttons arm Fire Puck (shot only), Mega Curve (amplified preview bend), or Freeze (stationary defenders for the next action). Canceling or making a tiny swipe preserves the charge; retry restores scenario grants. Freeze does not remove interception collisions or freeze the goalie.
- Results offer retry and next level; the header returns to level selection. Goals get a short celebration before the scrollable results appear.
- Preserve Expo / React Native / TypeScript / Three r162, anchored relative swipe input, authored movement, and reactive goalie behavior. iOS is the first playtest target; Android is also supported.
- Presentation includes camera punch, danger-shot and goal slow motion, net shake, colored powerup trails, ice spray, impact particles, goalie knockback, jumping celebrations, and animated callouts.

Validation: `npm run typecheck`, `npm test`, and Expo native bundle export. Physical-device checks remain necessary for GL rendering, touch feel, background/resume, menu navigation, and save/relaunch behavior.
Portrait mobile arcade hockey inspired by stop-and-swipe sports games, but intentionally exaggerated and non-realistic.

Core loop:

1. Play auto-advances along a scripted hockey sequence.
2. At key moments, everything freezes.
3. Player drags anywhere to draw a relative pass or shot path anchored to the puck.
4. The path is previewed while dragging.
5. On release, the path is lightly smoothed with only a small near-miss correction.
6. The puck follows the drawn path, including ridiculous curves.
7. Play continues until the next decision, goal, turnover, or rebound.

There is no separate pass/shot button. Destination determines intent.

## Feel
Fast, satisfying, chaotic, arcade-first.

Lean into:
- absurd puck curves
- dramatic camera moves
- exaggerated hits/saves/reactions
- particles, trails, screen shake, slow-mo
- future powerups and special shots
- readable gameplay over realism

Do not optimize for hockey simulation.

## Camera / Presentation
- Portrait only.
- 3D camera from above/behind the attacking team.
- Camera tracks play and may use scripted zooms/pans.
- If this perspective becomes unreadable, use a higher isometric angle.
- Semi-realistic hockey setting with intentionally over-the-top effects and animation.
- Procedural skaters use lightweight helmet, visor, shoulder, jersey, stick, and skate shapes. Moving skaters face their route; set skaters smoothly turn toward the puck so formations read as a live play.
- The rink uses a subtle ice sheen, contact shadows, detailed boards and netting, and low-cost rink-side light ribbons to imply a larger dark arena without textures or licensed branding.
- Goals combine camera punch, slow motion, a wider particle burst, springing net movement, goalie reaction, and staggered team celebration. Saves, rebounds, passes, banks, and powerups retain their distinct trails, spray, poses, callouts, audio, and haptic feedback.
- Campaign chapters share the dark/teal/yellow identity while using restrained teal, gold, blue, and violet accent rails for faster visual scanning. Animated callouts use a compact high-contrast arcade plate and must remain readable over play.
- UI motion honors the device reduced-motion preference; gameplay timing and aiming behavior do not depend on decorative animation.

## Input
One-finger swipe/draw anywhere on screen, with the preview anchored to the puck.

### Pass
- The drawn curve is the primary trajectory; no endpoint lock guarantees a pass.
- Teammates have a configurable pickup radius and skate toward reachable points along the projected puck path. A teammate can collect before the endpoint or receive a lead pass into space.
- Only obvious near-misses receive a small correction (at most 0.2 rink units by default). An endpoint already within pickup reach stays as drawn.
- Uncollected passes coast and slow down, then remain live until a skater collects them. Defenders retain interception priority in contested lanes. Reception freezes play at the actual contact point without teleporting the puck.
- Tune `DEFAULT_RECEPTION` in `src/game.ts`, or pass overrides as the second `Game` constructor argument. Defaults: pickup radius 0.98, initial pursuit radius 7, skating speed 7.8 units/second, coast drag 13 units/second squared, and board speed retention 0.88. Loose-puck retrieval has no distance limit or timeout.

### Shot
- Endpoint toward the net becomes a shot.
- Shot placement matters.
- A tall net has four high/low corner targets. Gold targets show current gaps; red marks current pad/body/glove coverage. The goalie can close a gap after release. Shot height affects saves, defender clearance, and crossbar misses.
- Less aim assistance than passes.
- Swipe speed may slightly affect puck speed/power.

## Gameplay Rules
- Time fully freezes during input.
- Teammates and defenders mostly follow authored routes.
- Defenders move on release; reception freezes play immediately. Receivers skate to reachable pickup points while skaters retain separation along their routes and at reception.
- Small reactions are allowed, but avoid general-purpose hockey AI.
- Defender collision/interception can fail the play.
- Bad shots can be saved.
- Some saves produce guided, visually physics-like rebounds.
- Rebounds may create another pause/decision.
- Unlimited retries for MVP.

## Goalie
Hybrid behavior:
- reacts to incoming shot direction
- projects the puck's current heading after a reaction delay, with limited lateral acceleration, glove speed, and recovery after saves; never reads the future drawn endpoint
- authored tendencies/save zones are acceptable
- shot placement must be capable of beating the goalie
- spectacle matters more than realism

## First Vertical Slice
One handcrafted scenario:

- 3 attackers
- 2 defenders
- 1 goalie
- one rink
- simple placeholder uniforms/models
- basic skating/goalie animation

Flow:
1. Auto-play into first pause.
2. Player makes breakout/pass.
3. Auto-play.
4. Second pause: curve pass around defender.
5. Auto-play.
6. Third pause: aimed shot.
7. Goal = success.
8. Save may produce one guided rebound opportunity.
9. Turnover/miss = fail and restart.

Original vertical slice excluded menus. The current scope adds level selection and local progression; accounts, economy, customization, multiplayer, and purchases remain excluded.

## Progression Later
Sixteen levels, local stars, campaign chapters, and scenario powerups are in scope. The larger career ideas below remain deferred.

Career chapters:
- Rookie
- Junior
- Pro
- Playoffs

Levels award up to 3 stars using simple objectives, not swipe-accuracy grading.

Examples:
- complete the scenario
- score with a specific player
- hit a marked lane / use a required pass
- finish without failing

Later systems may include powerups, special shots, unlocks, cosmetics, and an energy/lives system.

## Tech Direction
Use React Native with Expo.

Start with:
- TypeScript
- Expo
- a 3D renderer compatible with Expo/React Native
- gesture input
- lightweight animation state
- authored scenario data

Keep dependencies minimal. The coding agent may choose the exact 3D/animation packages.

Build the gameplay as a small state machine:
AUTO_PLAY -> PAUSED_FOR_INPUT -> EXECUTING_ACTION -> AUTO_PLAY / REBOUND / SUCCESS / FAIL

Prefer deterministic authored gameplay over complex physics or AI.

## MVP Success Criteria
The vertical slice is successful if:
- it runs from `npx expo start`
- portrait layout feels readable
- swiping feels responsive
- pass vs shot intent is obvious
- curved puck paths look fun
- scenario can contain multiple pauses
- defender interception works
- goalie can save or concede
- rebound continuation works
- retry is instant
- the game already feels arcade-y before progression exists
