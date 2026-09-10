# CLAUDE.md

## Goal
Build a polished-feeling arcade hockey prototype, not a hockey simulator.

## Priorities
User direction: get the core game mechanics right first. Defer powerups, additional levels, leagues, progression, and other extras until the swipe, spacing, passing, shooting, and goalie interactions feel good. Existing test scenarios are for validating those mechanics.

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
