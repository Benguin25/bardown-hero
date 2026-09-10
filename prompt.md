Build the first playable vertical slice described in SPEC.md.

Focus only on core gameplay.

Requirements:
- Expo + React Native + TypeScript
- portrait
- simple 3D hockey rink with placeholder players
- 3 attackers, 2 defenders, 1 goalie
- scripted auto-play between decision points
- full freeze at each decision point
- drag from puck to draw a visible trajectory
- endpoint near teammate = assisted pass
- endpoint toward net = shot
- drawn curve strongly affects puck path
- allow exaggerated/unrealistic curves
- execute the puck path on release
- defender interception/failure
- goalie save/goal behavior
- one guided rebound continuation
- instant retry
- 3 decision moments in one scenario

Add arcade juice early: puck trail, camera punch/zoom, slow-mo on important moments, and exaggerated reactions. Keep it lightweight.

Do not build menus, progression, accounts, stores, customization, or backend systems.

Use simple authored behavior over complex physics/AI. Make reasonable technical choices yourself. The project should run with `npx expo start`.
