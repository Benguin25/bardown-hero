# SPEC.md

## Game

## Current playable scope (September 2026)

Board-bank and presentation update:

- Draw toward either side or end board. The preview stops at first contact, with no reflected path. Release executes that approach, then reflects the incoming velocity at the board with arcade speed retention. Drawing beyond the first collision cannot steer the rebound. The puck coasts and teammates attempt normal pickups after impact.
- End-board passes may travel beside the goal but cannot pass through its cage. Ordinary shots keep their save/goal/miss rules.
- Slightly lower camera; both end boards remain framed before aiming. Net uses round posts, a tapered rear frame, and roof/side/back mesh. The goalie has a padded blocker and a catching glove with a laced pocket, without changing save zones.
- Every level start and retry shows its three objectives during a three-second countdown. Gameplay starts afterward; backgrounding pauses the countdown through the existing active-app loop.

The current request supersedes the original vertical-slice exclusions below.

- Ten authored portrait levels with 2–4 intended decision moments per run, including optional guided rebounds.
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

## Input
One-finger swipe/draw anywhere on screen, with the preview anchored to the puck.

### Pass
- The drawn curve is the primary trajectory; no endpoint lock guarantees a pass.
- Teammates have a configurable pickup radius and skate toward reachable points along the projected puck path. A teammate can collect before the endpoint or receive a lead pass into space.
- Only obvious near-misses receive a small correction (at most 0.2 rink units by default). An endpoint already within pickup reach stays as drawn.
- Uncollected passes coast briefly and slow down. Unreachable passes still fail; defenders retain interception priority in contested lanes. Reception freezes play at the actual contact point without teleporting the puck.
- Tune `DEFAULT_RECEPTION` in `src/game.ts`, or pass overrides as the second `Game` constructor argument. Defaults: pickup radius 0.9, pursuit radius 6, skating speed 7 units/second, board speed retention 0.84, and a 2.2-second loose-puck window in simulation time.

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
Ten levels, local stars, and scenario powerups are now in scope. The larger career ideas below remain deferred.

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
