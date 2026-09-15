Work on the current Bardown Hero repo and improve the moment-to-moment gameplay feel without adding major new systems.

Focus on:

* tune passing so lead passes and passes slightly ahead of teammates feel forgiving but still skill-based
* improve teammate puck pursuit/reception so players naturally skate onto passes rather than looking robotic
* tune defender pressure/interceptions so failures feel deserved, not random
* improve shot aiming and goalie balance so good corner shots reliably feel rewarding while bad shots can still be saved
* tune curve sensitivity so exaggerated curves are fun and controllable
* improve board-pass feel where needed
* make player movement, puck movement, and pauses between decisions feel faster and more arcade-like
* remove any awkward pauses, snapping, jitter, or obviously unnatural transitions you notice

Do not add currency, shops, accounts, multiplayer, cosmetics, or other meta systems.

Preserve the current swipe-anywhere input, 16-level campaign, progression, tutorial, powerups, audio, and existing mechanics.

Play through/reason through all 16 authored levels while making changes so existing intended routes still work.

Add or update tests for any gameplay behavior you change.

Run:

* npm run typecheck
* npm test

Update SPEC.md and launch.md with any meaningful behavior/tuning changes.

Prioritize “this feels fun on a phone” over realism.
