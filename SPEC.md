# SPEC.md

## Game
Portrait mobile arcade hockey inspired by stop-and-swipe sports games, but intentionally exaggerated and non-realistic.

Core loop:

1. Play auto-advances along a scripted hockey sequence.
2. At key moments, everything freezes.
3. Player drags from the puck to draw a pass or shot path.
4. The path is previewed while dragging.
5. On release, the path is lightly cleaned/snapped.
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
One-finger swipe/draw from the puck.

### Pass
- Endpoint near a teammate snaps/assists toward them.
- Player-drawn curve still strongly influences puck path.
- Generous touch tolerance.

### Shot
- Endpoint toward the net becomes a shot.
- Shot placement matters.
- Less aim assistance than passes.
- Swipe speed may slightly affect puck speed/power.

## Gameplay Rules
- Time fully freezes during input.
- Teammates and defenders mostly follow authored routes.
- Small reactions are allowed, but avoid general-purpose hockey AI.
- Defender collision/interception can fail the play.
- Bad shots can be saved.
- Some saves produce guided, visually physics-like rebounds.
- Rebounds may create another pause/decision.
- Unlimited retries for MVP.

## Goalie
Hybrid behavior:
- reacts to incoming shot direction
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

No menus, accounts, economy, customization, career UI, multiplayer, or purchases.

## Progression Later
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
