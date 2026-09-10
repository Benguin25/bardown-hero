# Run Bardown Hero on your iPhone

This is an Expo + React Native + TypeScript prototype. It opens into the original rush, with five selectable test scenarios. Your Windows PC runs the development server; your iPhone runs the game in Expo Go.

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
4. Keep the phone in portrait. The game automatically begins the opening rush.

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

- **Teal** players are your team. **Red** players intercept. **Gold** is the goalie.
- When **TIME FROZEN** appears, drag anywhere on the screen, including the lower instruction area. Your finger's movement draws a trajectory anchored to the gold puck ring. Start below the puck to keep the preview visible, then lift to execute. Taps do nothing; a second finger cancels the stroke.
- Finish near a teal teammate: the preview turns teal and says **ASSISTED PASS**. The endpoint snaps to that teammate while your curve remains.
- Finish toward the net: the preview turns gold and says **SHOT ON NET**. Aim inside the red posts; the gold ice rings mark the corners.
- Aim into the upright net's four rings for high-left, high-right, low-left, or low-right shots. Gold rings are open; the red ring is covered by the goalie's extended glove/pad. Coverage changes between decisions and after a rebound. The preview and puck rise to the selected height, and shots above the crossbar miss.
- A pink path with **NO TARGET** will leave a loose puck unless you redirect its endpoint before releasing.
- You can draw large curves and loops. Stay inside the boards and avoid red defenders.
- Tap **RETRY** at any time, or **RUN IT BACK** after the result, to immediately reset the scenario.

Use the temporary **TEST 1–5** buttons to switch scenarios. Retry restarts the selected level. Level 1 keeps the opening breakout, curved pass, and shot. Level 2 tests a pass around a defender; level 3 pauses immediately on a cross-ice reception for a one-timer; level 4 tests two blocked lanes and a curved shot around traffic; level 5 sets up a center shot for a guided rebound. Each authored route has 2–3 decisions, with at most one extra rebound. A second save ends the attempt. These are open test setups: you can still shoot early or choose another teammate.

## 4. Quick playtest checklist

1. **Breakout:** pass to the teammate on the right. Try the same stroke from the puck, empty ice, and the lower instruction area. The preview should always start at the puck and follow the same relative shape.
2. **Curve:** draw toward the left teammate while bending around the center defender. A straight pass to that teammate should be intercepted. Retry and try a wide curve.
3. **Freeze:** hold your finger down for several seconds. Players, goalie, camera, and effects should remain still. Lift to resume.
4. **Goal:** at the third decision, shoot into a corner inside the posts. Check for the goal result, trail, camera punch, and player celebration.
5. **Save/rebound:** retry and shoot toward the middle of the net. The save should kick the puck to the right teammate and pause again. Shoot to a corner to finish. Another center shot should be saved and end the run.
6. **Failure:** try shooting outside a post or ending a pass on empty ice. Check the failure message and instant retry.
7. **Interruption:** background and reopen Expo Go while drawing. The unfinished stroke should cancel, and the decision should remain available.

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
```

The tests cover the three decisions, curve preservation, full simulation freeze, interception, scoring, save/rebound behavior, missed shots, canceled input, and retry state. The export checks the iOS production bundle; it does not install an app on your phone.

Automated checks and iOS bundling were run during implementation. Physical iPhone rendering, touch feel, and frame rate still need the device playtest above.

## Where to change things

- `src/game.ts`: authored formations, path cleanup, input intent, state machine, collisions, goalie, and rebound.
- `src/rink.ts`: 3D rink and placeholder models, camera, trails, and reactions.
- `App.tsx`: touch input, game loop, lifecycle handling, and gameplay HUD.
- `tests/game.test.cjs`: deterministic gameplay checks.

The renderer uses Three.js with Expo GL, procedural geometry, and fixed effect pools. Gameplay uses authored movement and simple collision zones; there is no general physics engine, backend, menu system, or external asset download.
