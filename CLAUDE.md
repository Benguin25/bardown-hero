# CLAUDE.md

## Goal
Build a polished-feeling arcade hockey prototype, not a hockey simulator.

## Priorities
Current user direction: a polished thirty-two-level arcade campaign on the ink/teal/gold UI-redesign identity (see `src/theme.ts`). The campaign reads as a physical climb through six venues on one map, not a level list. Preserve swipe controls, authored movement, live receiver retrieval, board reflection, and goalie behavior. Keep the rink prominent, chrome compact, objectives readable, and campaign states clear. Use subtle transitions, star celebrations, and haptics, respecting reduced motion. iOS comes first; Android remains supported. Monetization remains deferred.

1. Core swipe gameplay
2. Juice / responsiveness
3. Readability in portrait
4. Simple architecture
5. Everything else

## Rules
- Use Expo + React Native + TypeScript.
- App should run with `npx expo start`.
- Keep dependencies minimal.
- Prefer simple authored behavior over complex AI or physics.
- Do not build backend/accounts/progression/store systems unless asked.
- Do not over-engineer abstractions for a one-scenario prototype.
- Keep scenario logic data-driven enough that another scenario can be added later.
- Preserve exaggerated curved puck paths. Do not "fix" them into realism.
- Stars belong to a single successful run. Persist the best run; never combine objectives across attempts.
- Completing a level unlocks the next within its venue. A venue itself opens on a total-star gate (`src/venues.ts`); gates never exceed the stars available before them, so replaying earlier levels always breaks one. Powerups must be tapped at their authored decision and last for one action.
- Use placeholder assets when needed.
- Keep gameplay code understandable and easy to iterate on.

## Design Intent
The game should feel intentionally ridiculous:
- dramatic puck trails
- hard curves
- camera punch
- slow motion
- impact feedback
- exaggerated goalie/player reactions
- future powerups

When choosing between realistic and fun, choose fun.

## Working Style
Make reasonable implementation decisions without asking unnecessary questions.

For significant changes:
- briefly state what you changed
- mention important tradeoffs
- note any manual setup required

Avoid large rewrites unless necessary.
