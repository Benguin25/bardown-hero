Now do a visual/presentation polish pass on Bardown Hero.

Do not redesign the core game or add large new systems. Make the existing game feel more like a finished arcade hockey game and less like a prototype.

Improve the presentation where practical within the current React Native + Expo GL + Three.js architecture:

* improve player and goalie visual models while keeping them stylized and lightweight
* improve skating, shooting, passing, goalie save, rebound, and celebration animations
* make players visually face/react toward the puck and current play more naturally
* improve rink/stadium atmosphere, lighting, ice appearance, shadows, boards, net, and background environment
* make goals feel significantly more satisfying with better camera movement, particles, net reaction, player celebrations, crowd/audio feedback, and timing
* add special feedback for genuinely exciting hockey moments such as BAR DOWN, post/crossbar hits, great passes, huge curves, bank assists, one-timers, and rebound goals
* improve slow motion, screen shake, camera punch, trails, ice spray, impact effects, and animated callouts without making the screen unreadable
* give the four campaign chapters slightly more visual identity if this can be done cleanly
* polish menus/results/gameplay HUD wherever something still visibly feels like development UI

Keep the current dark/teal/yellow Bardown Hero identity rather than replacing it with a totally new design.

Do not use copyrighted NHL logos, teams, jerseys, arena branding, music, or other protected assets. Prefer original/procedural visuals.

Keep performance suitable for a real iPhone. Avoid adding heavy dependencies unless clearly necessary.

Preserve reduced-motion support and current gameplay behavior.

Run:

* npm run typecheck
* npm test
* Expo export/bundle checks if appropriate

Update SPEC.md and launch.md to reflect meaningful presentation changes.
