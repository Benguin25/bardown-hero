Expand the current arcade hockey prototype into a small playable game while preserving the existing core swipe gameplay.

Keep the current controls and architecture. Do not rewrite working systems unless necessary.

Build the following:

Level select
Simple polished screen with around 8–12 playable levels.
Levels unlock sequentially.
Show earned stars on each level.
3-star objectives
Every level has 3 simple objectives.
Examples: complete the play, score top shelf, use a curved pass, score without retrying, complete a specific pass.
Stars should be awarded and shown after completion.
Store progress locally on device. No backend/accounts.
More handcrafted scenarios
Create enough varied scenarios to test the game properly.
Use 2–4 decision moments per level.
Include breakaways, cross-ice passes, one-timers, traffic in front, rebounds, curved shots, multiple defenders, and tight passing lanes.
Reuse the authored/scripted movement approach rather than building complex hockey AI.

Arcade powerups
Add a lightweight powerup system with 3 powerups:

Fire Puck: extremely fast shot, huge trail, stronger screen shake, dramatic goalie reaction.
Mega Curve: temporarily allows absurdly strong puck curvature.
Freeze: freezes defenders during the next action.

Powerups should be given by specific levels/scenarios for now. Do not build a shop, inventory economy, or purchases.

Arcade presentation
Push the game much further visually:
dynamic camera zoom/punch
slow motion on dangerous shots and goals
net shake
puck trails
ice spray / impact particles
dramatic goalie reactions
player celebration
floating callouts like BAR DOWN, FILTHY, THREAD THE NEEDLE, TOP SHELF
satisfying transitions between decision moments
Results screen
After each level show:
level complete
stars earned
objectives completed
retry
next level
Game feel
Continue improving swipe smoothing, pass snapping, shot aiming, puck curves, reset reliability, goalie behavior, and rebound handling wherever needed.

Important design direction:

This is not a realistic hockey simulator.
Make it ridiculous, fast, flashy, and satisfying.
Prioritize fun and readability over physical accuracy.
Crazy puck curves and exaggerated effects are intentional.
Keep portrait orientation.
Keep the ability to drag anywhere on screen while the rendered trajectory stays anchored to the puck.

Do not add:

accounts
backend
multiplayer
real-money purchases
battle pass
cosmetic store
complicated economy

Use local persistence only.

Make reasonable design and implementation decisions yourself. The goal is to end this task with something that feels like a small arcade mobile game rather than a tech demo.