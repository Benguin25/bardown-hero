# Run Bardown Hero on your iPhone

This is an Expo + React Native + TypeScript arcade game. It opens into a 32-level campaign with six chapters, local progress, and 96 stars to chase. Your Windows PC runs the development server; your iPhone runs the game in Expo Go. Android is also supported through Expo Go; iOS is the first playtest target.

## 1. Install these once

1. On Windows, install **Node.js LTS** from [nodejs.org](https://nodejs.org/en/download). Keep the installer’s **Add to PATH** option enabled. npm and npx come with Node; you do not need to install them separately.
2. Close and reopen PowerShell (and VS Code, if its terminal was already open).
3. On your iPhone, install or update **Expo Go** from the App Store. This project uses **Expo SDK 57**.
4. Connect your PC and iPhone to the same Wi-Fi network.

Check Node in a new PowerShell window:

```powershell
node --version
npm.cmd --version
```

Node 24 LTS was used for this project. You do not need Xcode, Android Studio, a paid Apple developer account, or a globally installed Expo CLI to test in Expo Go.

## 2. Start the project

In PowerShell:

```powershell
cd "C:\Users\benpr\Downloads\BP Portfolio\bardown-hero"
npm.cmd install
npx.cmd expo start
```

`npx expo start` also works when your shell permits npm’s PowerShell scripts. The `.cmd` spelling avoids the Windows “running scripts is disabled” error without changing your execution policy.

Wait for the terminal’s QR code, then:

1. Open the **Camera** app on your iPhone.
2. Scan the QR code and tap **Open in Expo Go**.
3. If prompted, allow Expo Go access to your local network.
4. Keep the phone in portrait. Select the first unlocked level to begin.

Leave the terminal open while testing. Save code changes to reload the app. Press **r** in the Expo terminal to reload manually; press **Ctrl+C** to stop the server.

### Portable Node already in this workspace

A project-local Node runtime and dependencies were downloaded during development. To test immediately without installing Node system-wide, use this in PowerShell:

```powershell
cd "C:\Users\benpr\Downloads\BP Portfolio\bardown-hero"
$bardownNode = Get-ChildItem -LiteralPath .tooling -Directory -Filter 'node-*-win-x64' | Select-Object -First 1
$env:PATH = "$($bardownNode.FullName);$env:PATH"
npx.cmd expo start
```

This PATH change lasts only for the current terminal. `.tooling` is ignored by Git and is not included if you clone the project elsewhere; use the standard Node installation steps on a fresh checkout.

## 3. Play

Audio is enabled by default: the campaign and gameplay headers include an **SND ON/OFF** toggle. Bardown Hero uses original punchy arcade hockey effects for releases, passes, boards, saves, goals, powerups, and countdowns, plus a looping upbeat stadium-electronic instrumental. The setting is saved locally, audio stops when the app is backgrounded, and playback is configured to remain audible when the iPhone silent switch is on.

New players see **How to Play** and can start four guided practice lessons. Reopen **HOW TO PLAY** from the campaign to replay them. Practice does not award campaign stars or unlock levels.

One skater from each team chases the puck while supporting players move in formation. Receivers keep a reachable pickup lane instead of repeatedly swapping the chase. Defenders pressure the travel direction with limited anticipation and need a close stick touch to intercept; a clear pass beside them can get through. Loose pucks stay live until collected, including after they stop. Your original passer can recover one without earning a pass star; red possession ends the attempt.

- **Teal** players are your team. **Red** players intercept. **Gold** is the goalie.
- When the play pauses, drag anywhere on the screen, including the lower instruction area. Your finger's movement draws a trajectory anchored to the gold puck ring. Start below the puck to keep the preview visible, then lift to execute. Taps on the ice do nothing; a second finger cancels the stroke.
- Draw past or ahead of a teal teammate. **PASS INTO REACH** means a teammate is near the endpoint; **OPEN ICE** lets you play into space. Teammates skate toward reachable pickup points and can collect anywhere along the path. Their ice rings show pickup reach. There is no endpoint lock or guaranteed reception.
- Finish toward the net: the preview turns gold and says **SHOT ON NET**. Aim inside the red posts; the gold ice rings mark the corners.
- Aim into the upright net's four rings for high-left, high-right, low-left, or low-right shots. Gold rings show current gaps; red rings show current goalie coverage. The goalie reads the puck's heading after a short reaction delay, slides with momentum, and reaches with the glove. A gold target is not a guaranteed goal: quick shots, close-range passes, and late bends can beat the reaction. Saves leave a short recovery period. The preview and puck rise to the selected height, and shots above the crossbar miss.
- Blue **OPEN ICE** paths are valid lead passes. The puck coasts if nobody collects it along the drawn path, then stays live while the nearest skaters compete to retrieve it.
- You can draw large curves and loops. Stay inside the boards and avoid red defenders.
- Tap **RETRY** at any time, or **RUN IT BACK** after the result, to immediately reset the scenario.
- Each start/retry shows the level objectives and counts down **3–2–1** before the rush begins.
- For a **BANK PASS**, draw toward a side or end board. The preview stops at the first collision. On release, the incoming angle determines the rebound; extra drawing beyond that collision has no effect. Teammates chase reachable pickups after the bounce. Bank around the outside of the cage; the puck cannot travel through its back. Ordinary missed shots still end the attempt.

Use the **‹** back button to return to the campaign. A goal unlocks the next level regardless of stars. Each level has three objectives shown on its card and results screen. Stars must be earned together in one run; only the best run is saved, and tied runs do not merge objectives. Retry restarts the selected level with fresh powerups. The original levels 1–16 are unchanged. Levels 17–20 introduce a give-and-go, low-to-high cycle, side-board carom one-timer, and cross-ice lead. Levels 21–26 combine double banks, Freeze, deliberate rebounds, Mega Curve screens, route choice, and bank-to-lead play. Levels 27–32 are late-game sequences: puck races, a 3-on-2, Freeze-to-bank, cross-ice redirects, a screened Fire Puck rush, and a five-decision finale. Passing behind the net is intentionally not authored yet because it needs dedicated cage-routing logic. A second save ends the attempt. You can still shoot early or choose another teammate.

At designated decisions, tap the yellow **TAP TO CHARGE** powerup button before drawing. Fire Puck requires a shot and makes it extremely fast; Mega Curve amplifies the bend shown in the preview; Freeze holds defenders in place during the next action, but they can still intercept. Charges survive canceled swipes. Powerups are granted by the scenario, with no inventory or purchases.

Gameplay feel pass: passes, receiver pursuit, and the opening skate are faster, with a shorter guided rebound pause. Slow motion starts only for shots near the goal and their rebounds; passes through the same area remain at full speed. A receiver now commits to an interception point and skates there to meet a good pass rather than following directly on top of the puck. Missed passes remain live and the closest reachable teammate gives chase. Lead passes have slightly more collection reach, and banks keep more speed after contact. Receivers hold their position during a bank approach and chase after the bounce; a puck that actually touches a teammate can still be collected before the wall. Mega Curve retains its exaggerated bend with less sensitivity to uneven finger sampling. Corner targets now tolerate a slightly imprecise thumb finish, while center shots remain aimed at the pads. Skaters turn smoothly instead of snapping to each new heading. Try near-corner swipes from several starting points on the screen, then deliberately aim wide or high to check that placement still matters.

Presentation polish pass: skaters and the goalie now have clearer procedural helmets, visors, shoulders, jersey details, sticks, and skates while staying lightweight for a phone GPU. Skaters in motion face their route; stationary and supporting players smoothly watch the puck. A soft ice sheen and animated rink-side light ribbons give the arena more depth. Goal celebrations add a wider burst, stronger net spring, and more expressive team movement, while the existing slow motion, camera punch, trails, spray, goalie reactions, audio, and haptics remain intact. Campaign chapters have restrained color accent rails, and moment callouts sit on a more readable arcade plate. No licensed team or arena assets are used.

## 4. Quick playtest checklist

Campaign polish: check cleared, next, and locked cards; try the continue button; open star objectives with **☆ 3** during a decision. Check the compact countdown, fading instructions during flight, result-star animation, and haptics. Repeat with the device’s reduced-motion setting enabled. Old ten-level saves should retain every star and unlock level 11 after level 10.

New highlights: levels 17–32 add sixteen distinct authored situations across **CREATIVE CHAOS** and **LEGENDARY ICE**. Check that their coral and lime chapter rails are visually distinct, chapter scores read 24 stars each, and the campaign total reads 96. Bank and lead stars require the puck to be collected, not just aimed at the desired spot.

For a development-only browser preview, run `npm.cmd run preview`. The web dependencies are development dependencies; the native Expo app remains the primary playtest target.

1. **Breakout:** pass to the teammate on the right. Try the same stroke from the puck, empty ice, and the lower instruction area. The preview should always start at the puck and follow the same relative shape.
2. **Curve:** draw toward the left teammate while bending around the center defender. A straight pass to that teammate should be intercepted. Retry and try a wide curve.
3. **Freeze:** hold your finger down for several seconds. Players, goalie, camera, and effects should remain still. Lift to resume.
4. **Goal:** at the third decision, shoot into a corner inside the posts. Check for the goal result, trail, camera punch, and player celebration.
5. **Save/rebound:** retry and shoot toward the middle of the net. The save should kick the puck to the right teammate and pause again. Shoot to a corner to finish. Another center shot should be saved and end the run.
6. **Failure and retrieval:** shoot outside a post or into red coverage and check instant retry. Then pass into empty ice: players should chase until one collects it, even after the puck stops. Self-recovery should not advance the level or award a pass star.
7. **Interruption:** background and reopen Expo Go while drawing. The unfinished stroke should cancel, and the decision should remain available.
8. **Progress:** finish a level, inspect objectives and stars, then close and relaunch the app. The next level and best single-run stars should remain available. Retry for a different two-star combination and verify it does not become three stars.
9. **Powerups:** reach levels 6–8, activate each contextual button, cancel a stroke, then execute. Verify Fire Puck needs a shot, Mega Curve preview matches flight, and Freeze lasts for one action. Retry restores the grant.
10. **Small screens:** scroll level selection and results, tap next level, return to the menu repeatedly, and verify the rink reloads and the net stays visible. Repeat on Android after iOS.
11. **Presentation:** watch stationary players before release and confirm they face the puck without jitter. During skating, confirm they face travel. Score an ordinary goal and a Fire Puck goal; check the net spring, particle burst, celebration poses, callout readability, and that rink-side lights stay outside the boards and never cover the play.

## Troubleshooting

**“node” or “npx” is not recognized**

Install Node.js LTS, then reopen the terminal. Alternatively use the portable Node steps above.

**The phone cannot connect / QR code opens but keeps loading**

- Ensure both devices use the same network; guest Wi-Fi can block devices from seeing each other.
- If Windows asks about Node.js firewall access, allow it on your trusted **Private** network.
- Check iPhone Settings → Expo Go → **Local Network**.
- If LAN access still fails, stop Expo with Ctrl+C and try:

```powershell
npx.cmd expo start --tunnel
```

The CLI may ask to install its tunnel helper. Tunnel mode needs internet access and can load more slowly. See [Expo CLI tunneling](https://docs.expo.dev/more/expo-cli/#tunneling).

**Expo Go says the SDK is incompatible**

Update Expo Go from the App Store. This project uses SDK 57; its dependencies are locked together in `package-lock.json`. Do not change only React Native or only Expo to work around a mismatch.

**Red error screen / stale bundle after an edit**

Stop the server and run:

```powershell
npx.cmd expo start --clear
```

**The rink cannot load**

If the error says **“WebGL 1 is not supported since r163”**, stop the Expo server and run:

```powershell
npm.cmd install
npx.cmd expo start --clear
```

Then reopen the project in Expo Go. The project pins Three.js and its types to **0.162.0** to accept Expo's native GL context. Keep that pin until a newer renderer has been verified on a physical iPhone. Updating Expo Go alone does not fix this dependency mismatch.

Use the native Expo Go app with remote JavaScript execution disabled. Expo GL requires native synchronous calls; see [Expo GLView documentation](https://docs.expo.dev/versions/latest/sdk/gl-view/). Share the exact error text if restarting Expo Go does not help.

## Development checks

```powershell
npm.cmd run typecheck
npm.cmd test
npx.cmd expo-doctor
npx.cmd expo export --platform ios
npx.cmd expo export --platform android
```

The tests replay three-star routes through all 32 levels at 120, 60, 30, and 20 fps and cover both receiver choices in Double Take, old-save compatibility, single-run persistence rules, unlocks, powerup lifetimes, curve preservation, full simulation freeze, interception, scoring, save/rebound behavior, missed shots, canceled input, retry state, and phone-size camera projection. Exports check production bundles; they do not install an app on your phone.

This gameplay and presentation pass was checked with `npm run typecheck`, `npm test`, and production Expo export checks. Physical iPhone rendering, touch feel, and frame rate still need the device playtest above.

## Where to change things

- `src/content/levels.ts`: original campaign order, chapter metadata, stable IDs, objectives, and card highlights. `src/content/extraLevels.ts` contains append-only levels 17–32.
- `src/content/types.ts`: reusable authored-content types and validation rules. Add a powerup or objective identifier here before referencing it from a level.
- `src/game.ts`: path cleanup, input intent, state machine, collisions, goalie, and rebound simulation. It imports the catalog and keeps compatibility re-exports for existing callers.
- `src/rink.ts`: 3D rink and placeholder models, camera, trails, and reactions.
- `App.tsx`: touch input, game loop, lifecycle handling, and gameplay HUD.
- `src/progress.ts`: local-save schema, best-run selection, and sequential unlock rules.
- `tests/content.test.cjs`: catalog validation and stable-ID/index mapping. `tests/game.test.cjs` covers deterministic gameplay.

To add a future level, append its authored moments, three-objective set, and campaign-card highlight in `src/content/extraLevels.ts`, then extend the explicit chapter counts in `src/content/levels.ts` if the new level starts a chapter. Do not insert or reorder shipped levels: AsyncStorage version 1 intentionally keys runs by their existing array index. Give the new entry the next stable `level-NN` ID, run the checks below, and add a deterministic successful route test. Most levels should require no change to `src/game.ts`; engine edits are reserved for new mechanics.

The renderer uses Three.js with Expo GL, procedural geometry, and fixed effect pools. Gameplay uses authored movement and simple collision zones; there is no general physics engine, backend, or external asset download. AsyncStorage saves progress locally on the device.
