Improve the existing hockey prototype without changing the overall game structure.

Focus on two areas:

Better swipe input
The player should be able to start dragging anywhere on the screen, not directly on the puck/path.
The actual preview trajectory should still always begin at the current puck carrier/puck.
Treat the user’s drag like a relative gesture: where they drag on screen controls the shape/direction of the puck path.
This should let the user drag lower on the screen so their finger does not cover the trajectory preview.
Keep the visible trajectory preview anchored to the puck/player.
Preserve curve drawing, path smoothing, teammate snapping, pass vs shot detection, and swipe-speed influence.
Make the control feel intuitive and forgiving on a phone.
Add more test scenarios
Keep the existing opening scenario.
Add 3–5 additional handcrafted levels that reuse the same mechanics.
Levels should be short and have 2–4 decision pauses.
Test different situations such as:
threading a curved pass around a defender
cross-ice one-timer
two defenders blocking different lanes
goalie save into a guided rebound
difficult curved shot around traffic
Keep player/defender movement authored and simple.
Add a very basic temporary way to switch between test levels. This can be dev-only/simple buttons or a level index, not a polished menu.

Also fix obvious bugs encountered while doing this, especially reset/retry, puck state, pause/resume, and path execution issues.

Do not add progression, currencies, cosmetics, accounts, shops, powerups, or polished menus yet.

Prioritize making the swipe mechanic easy to read and fun to repeat.