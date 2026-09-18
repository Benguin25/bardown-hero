# Handoff: Bardown Hero UI Redesign

## Overview
A full UI redesign of **Bardown Hero** (Expo / React Native + Expo-GL/three.js hockey game). The current build reads as a developer build: flat bordered cards, all-caps system type, no sense of place, and a campaign that is an endless scrolling list of 32 level cards.

The redesign replaces the campaign with a **physical progression map** — a single path that climbs bottom-to-top through six venues, from a backyard pond to the big league — and re-skins every other screen onto one visual system.

Eight screens are specified: campaign map, level card, venue unlocked, intro countdown, in-game HUD, result, locker, medals.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, **not production code to copy directly**.

The task is to **recreate these designs in the existing Expo / React Native codebase**, using its established patterns: `StyleSheet.create`, `View`/`Text`/`Pressable`, the existing `src/ui.tsx` style object conventions, and `react-native-svg` (already a dependency) where arcs/rings are needed. Do not port HTML/CSS verbatim — CSS features used here for convenience (`conic-gradient`, `repeating-linear-gradient`, `box-shadow`, `clip-path`) must be re-expressed as `react-native-svg`, `expo-linear-gradient`, elevation/shadow props, or layered Views.

Open `Bardown Hero Final.dc.html` in a browser to see all eight screens annotated. `Bardown Hero UI.dc.html` is the full exploration history, including a pixel recreation of the CURRENT UI (turn 0) for before/after comparison.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii and copy are final. Recreate pixel-accurately at a 402×874 logical viewport (iPhone 16 Pro), scaling with flex for other sizes. Layout is expressed in absolute pixel offsets only where the map path requires it; everything else is flex.

---

## Design Tokens

### Colors
| Token | Hex | Use |
| --- | --- | --- |
| ink | `#04101A` | App background |
| ink-raised | `#071D2A` | Modal / card background |
| surface | `#0A2434` | Cards, stat tiles, inputs |
| surface-border | `#16394A` | 1px card borders |
| surface-border-strong | `#1D4E5E` | Modal borders |
| teal | `#17E2AD` | Primary action, cleared state, eyebrow labels |
| teal-deep | `#0D3A35` | Equipped/selected card fill |
| gold | `#FFC531` | Stars, current node, power, callouts |
| gold-grad | `#FFD76B → #E8A51D` | Earned medals, trophy chips (160°) |
| ice-100 | `#F2FBFD` | Primary display text |
| ice-200 | `#EAF6FA` | Body headings |
| ice-300 | `#B9D6E2` | Secondary buttons |
| ice-400 | `#8FB0C0` | Body copy |
| ice-500 | `#6E91A3` | Meta / captions |
| ice-600 | `#5D788A` | Labels on dark |
| ice-700 | `#2F5668` | Empty stars, disabled |
| locked | `#9DBCCB` @ 50–62% opacity | Locked nodes and rows |
| glass | `rgba(220,245,255,.06–.07)` | HUD chrome, result card |
| glass-border | `rgba(180,220,240,.12–.16)` | Glass borders |

### Typography
Three families, loaded via `expo-font`:
- **Archivo** — `900 italic` for all display type (level names, result verdicts, section heads); `900` upright for row/card titles.
- **Barlow Condensed** — `800` for all-caps eyebrow labels and buttons, `500` for body copy. Always with letter-spacing.
- **Space Mono** — `700` for every numeral (level numbers, star counts, stats, percentages).

| Role | Font | Size | Weight | Letter-spacing |
| --- | --- | --- | --- | --- |
| Display XL (result verdict) | Archivo italic | 46 / line-height 46 | 900 | −2 |
| Display L (level name on map) | Archivo italic | 24 / 24 | 900 | −0.9 |
| Display L (card title) | Archivo italic | 32 / 31 | 900 | −1.4 |
| Countdown numeral | Archivo italic | 128 | 900 | −6 |
| Callout plate | Archivo italic | 34 | 900 | −1.2 |
| Screen title | Archivo italic | 22 | 900 | −0.8 |
| Row title | Archivo | 12–14 | 900 | −0.2 |
| Eyebrow | Barlow Condensed | 9 | 800 | 2.2–3.6 |
| Label / button | Barlow Condensed | 10–11 | 800 | 1.4–1.6 |
| Body | Barlow Condensed | 12–15 | 500 | 0.3–0.4 |
| Numeral | Space Mono | 10–19 | 700 | 0 |

**Minimum readable size is 9px only for tracked all-caps labels.** Body copy never below 11px.

### Spacing & shape
- Screen padding: `18px` horizontal (map, locker, medals), `20px` (result), `12px` (HUD chrome).
- Safe-area top offset used in mocks: `52–60px`. Bottom: `34–44px`.
- Gaps: `9px` between sibling cards, `14–16px` between groups.
- Radii: `8` (thumbnails) · `11–13` (chips, small tiles) · `15` (cards) · `20` (panels) · `24–26` (modals) · `29` (pill buttons) · `50%` (nodes, medals).
- Shadows: modal `0 30px 70px rgba(0,0,0,.66)`; gold glow `0 0 0 8px rgba(255,197,49,.10), 0 18px 44px rgba(255,197,49,.24)`; callout `0 10px 30px rgba(255,197,49,.28)`.

---

## Screens

### 1. Campaign Map — replaces the level list in `src/ui.tsx`
**Purpose:** The player sees their whole career as one climb and taps the next node.

**Layout:** Vertical scroll, content ordered **bottom-to-top** (venue 1 at the bottom). Full-bleed venue bands stack behind the path; each band is a fixed-height region with its own gradient. The path is a **2px dashed column at x = 44** — dashes `5px on / 7px off`; teal `#17E2AD` for the segment behind cleared nodes, `rgba(157,188,203,.32)` ahead.

Node x-offsets alternate `24 / 82 / 96` so the path meanders. Vertical pitch between nodes ≈ `78–80px`.

**Components:**
- **Header (absolute, top 52):** left pill — 34px tall, radius 17, `rgba(6,21,32,.82)`, 1px `rgba(180,220,240,.14)`, containing a 24px teal rounded square with the jersey number and `#9 PLAYER` in Barlow 800/10/1.4. Right pill — same shell, `★ 9 /96` (gold star 12px, gold Space Mono 12, `/96` in ice-600 10).
- **Star gate card (top 118):** full-width, radius 15, `rgba(6,21,32,.7)`, **1px dashed** `rgba(157,188,203,.28)`, padding 12/14. 40px lock tile, eyebrow `VENUE 03 · JUNIOR BARN`, headline `SEALED · 12 ★ TO OPEN` (Archivo italic 15, ice at 62%), right numeral `9/12` (gold / ice-700 split).
- **Venue banner:** centered Barlow 800/9 label with letter-spacing 3 between two 1px hairlines that fade out; teal for the active venue, ice-600 for cleared. Real venue art, when it exists, becomes the band backdrop behind the path.
- **Trophy strip:** radius 13, `rgba(255,197,49,.09)` on `rgba(255,197,49,.3)`, reads `PERFECT-RUN TROPHY · 9 / 12 ★` with `3 LEFT` right-aligned.
- **Level node (52px):** outer circle is the star ring — a gold arc of `stars/3 × 360°` over a `rgba(255,197,49,.2)` track; inner 41px circle `#0D2E28` (cleared) or `#0B1A24` (locked, 1px dashed border), with the 2-digit level number in Space Mono 14. Label block to the right: title Archivo 900/12, sub-label Barlow 800/9 (`3 / 3 ★ PERFECT`, `1 / 3 ★ · REPLAY`, `LOCKED`, `NEXT AFTER THIS`). Locked nodes render at `.5–.62` opacity, the next-up node at `.82`.
- **Current node (88px):** solid gold disc with the level number (Space Mono 19) and `PLAY` (Barlow 800/9), gold glow shadow, and the **player avatar standing on it** — a 44×52 figure offset `left:−16, top:−30`: 24×22 head `#C78F68` with a `#EAF6FA` helmet cap, and a 32×28 teal jersey with the number, both 2px `#04101A` outlined. Right of it: eyebrow `YOU ARE HERE` in gold, level name Archivo italic 24/24, hint line Barlow 500/12.

**Scroll behavior:** on mount, scroll so the current node sits at **62% of viewport height**.

### 2. Level Card — new modal
**Purpose:** Confirm the level and show its three stars before playing.

**Layout:** Modal `left/right 14`, top 300, radius 24, `#071D2A` on 1px `#1D4E5E`, with the modal shadow. Map dims to **28% opacity** behind it (no blur — RN cost).

**Components:** 104px header band (`160°` gradient `#0C2B3A → #071D2A`) holding a 34px gold level disc, the venue eyebrow in teal, and a 30px close circle — the level still fills this band once art exists. Body padding `2/20/20`: title Archivo italic 32/31, tagline Barlow 500/14, then **three equal star tiles** (radius 12, `#0A2434` on `#16394A`, 11px/8px padding, empty star `#2F5668` 16px over a Barlow 800/9 label). Divider row `BEST RUN` / value in Space Mono 11. Primary button 60px, radius 15, teal, `▶ HIT THE ICE` in Archivo italic 20 on ink.

**Animation:** card scales `0.55 → 1` with transform-origin at the tapped node's measured centre, **220ms ease-out**; backdrop dim over 160ms. Close reverses.

### 3. Venue Unlocked — new celebration state
**Purpose:** Pay off a chapter's star gate and pull the player into the next venue.

**Layout:** Top 540px is the new venue's band (`180°` `#123024 → #0A2230 → #04101A`) with a gold radial glow `radial(75% 40% at 50% 46%)`. Centered stack at top 286: eyebrow `12 / 12 ★ EARNED`, `GATE BROKEN` in Archivo italic 44/41 gold with a `0 10px 44px rgba(255,197,49,.34)` glow, then a Barlow 500/15 line. Below: unlock card (radius 20, gold-bordered) with a 48px gold trophy tile, then the new venue banner, then the next level's 88px node with the avatar already standing on it. Bottom: 58px teal pill `WALK INTO THE BARN →`.

**Trigger:** the chapter's earned-star total reaches its gate value. Avatar animates up the path into the new band, then this state lands.

### 4. Intro Countdown — replaces the intro block in `App.tsx`
Rink visible at full brightness under a `rgba(4,16,26,.62)` scrim. HUD chrome pill at top (back button, level name, `05/32`). Centered `3` in Archivo italic 128, gold, letter-spacing −6, with `MAKE IT COUNT` in teal Barlow 800/10/4 beneath. Three objective rows at top 500: radius 14 glass rows, 30px gold-outlined star circle + Barlow 700/13 objective text. Bottom hint `DRAG ANYWHERE TO DRAW YOUR PLAY` in Barlow 500/13.

**Animation:** numeral swaps 3→2→1 at 1s intervals, each tick scaling `1.3 → 1`. Objective rows stagger in 60ms apart.

### 5. In-Game HUD — replaces header/arena/bottom blocks in `App.tsx`
**Rink-first.** The current bottom slab is **deleted**.

- **Top chrome (top 60):** 34px back square, a flexible glass pill with the level name (Barlow 800/10/1.5) and **three objective dots** right-aligned (teal = earned, gold = just earned, `#2F5668` = pending), 34px restart square.
- **Callout plate:** centered at 27% height — gold plate `skewX(-8°)`, padding 6/22, text counter-skewed `skewX(8°)` in Archivo italic 34 on ink, with the gold shadow. Pops in 180ms, holds 700ms, fades.
- **Aim pill (bottom 52 stack):** glass pill, `AIM` eyebrow in teal + direction in Archivo italic 15.
- **Power ring + fire button:** 96px ring, 5px stroke — `rgba(180,220,240,.16)` track with a gold arc sweeping `0 → 360°` as the tap charges; inner 74px gold disc with a bolt glyph and live `78%` in Space Mono 11. **Build the arc with `react-native-svg` `Circle` + `strokeDasharray`/`strokeDashoffset`.**

### 6. Result — restyles the terminal block in `App.tsx`
Rink at 50% opacity under a `rgba(4,16,26,.62)` scrim. Glass panel (radius 26, `rgba(220,245,255,.07)` on `rgba(180,220,240,.16)`, padding 26/22): eyebrow `LEVEL 02 CLEARED`, verdict `BAR DOWN` in Archivo italic 46/46, then **three 46px gold star discs**. Hairline divider, then three objective rows — teal dot, Barlow 600/12 objective, Space Mono 10 measured value (`1 SHOT`, `1.8m`, `BAR`). Below: dashed replay card with an 86×52 still (a captured frame of the run). Bottom: 58px teal pill `NEXT RUSH →`, 46px glass pill `BACK TO THE MAP`.

**Animation:** stars land one at a time, **140ms apart**, scale `1.6 → 1`, each with a haptic tick. `BACK TO THE MAP` returns to the map with the avatar walking to the next node.

### 7. Locker — restyles `ProfileScreen` in `src/progressionUI.tsx`
Header row (34px back, teal eyebrow `THE LOCKER`, `MAKE IT YOURS` in Archivo italic 22). **Display case:** 322px, radius 20, `#123C48 → #0B2836`, 1px `#1D4E5E`, with a teal radial spotlight across the top 170px and a 210px faint circle behind the figure.

**The player figure is the EXISTING `LockerAvatar` construction — keep its geometry exactly.** Only the case around it is new. Caption bar at the bottom of the case: `#9 PLAYER` (Archivo 900/16) + `CLASSIC · SHELL · WOOD` (teal Barlow 800/9), with `TAP TO EDIT` in Space Mono 10.

Below: name/number fields as two surface cards. Then three cosmetic categories, each a gold banner with an owned-count (`JERSEY STYLE 2 / 6`, `HELMET 1 / 4`, `STICK 1 / 3`) — matching the slots in `src/profile.ts` and the `CLASSIC · SHELL · WOOD` caption. Jersey style is a **3-column grid** of style tiles — each a 34px swatch preview over the name and state (`EQUIPPED` teal on `#0D3A35` with a 2px teal border; `OWNED` on surface; locked tiles dashed at 55% opacity naming their unlock, e.g. `3 ★ POND`). Helmet and stick are **2-column rows** with a small shape swatch (helmet cap, stick shaft) beside the name, same equipped/locked treatment.

### 8. Medals — restyles `AchievementsScreen` in `src/progressionUI.tsx`
Header with `4/20` counter, then a 6px progress bar (gold on `#12303F`). **2-column grid** of medal tiles (radius 15, padding 14): earned tiles use the gold gradient background `#2A2413 → #0F1A20` with a `#6B5C2A` border and a 42px gold-gradient disc; locked tiles sit on surface with a `#12303F` disc and a `#2F5668` star. Each tile: title Archivo 900/14, description Barlow 500/11, and — where one exists — a gold `REWARD · GOLD RUSH` line in Barlow 800/8. Footer: three stat tiles (`4 GOALS`, `7 PASSES`, `9 STARS`).

Unlock toast reuses the same tile, pinned to the top of the play screen.

---

## Interactions & Behavior
| Trigger | Result |
| --- | --- |
| Tap a node | Level card expands from the node (220ms) |
| Tap locked node | Gate card shakes; no navigation |
| `HIT THE ICE` | Intro countdown → play |
| Tap/hold during play | Power ring charges 0→100% |
| Goal scored | Callout plate pops, objective dot turns gold |
| Run ends | Result panel, stars land 140ms apart |
| `NEXT RUSH` | Straight into the next level's countdown |
| `BACK TO THE MAP` | Map, avatar walks to the next node |
| Chapter gate met | Venue Unlocked state, then the new band |
| Map header pills | Locker (left) / Medals (right) |

## State Management
Existing state in `src/progress.ts` / `src/career.ts` is sufficient. Additions:
- `venues: Venue[]` derived from chapters — `{ id, name, order, gateStars, artKey }`.
- `activeVenueId` — derived from the first incomplete level.
- `mapScrollAnchor` — the measured y of the current node, for scroll-on-mount and the card's transform origin.
- `avatarWalkTarget` — node id the avatar animates toward after a result.
- Star gates: a venue is playable when `earnedStarsBefore >= venue.gateStars`.

## Assets
No production art exists yet. The mocks use:
- **Stylized geometry** for every venue band (gradients + faint circles) — this ships fine as-is.
- **Art to commission:** six venue backdrops at 402×430 @3× (must read behind a dark scrim and hold legible text — low detail, dark values); 32 level stills at 168×108 @3× for the level-card header; a lock and a bolt icon.
- Fonts from Google Fonts: Archivo, Barlow Condensed, Space Mono.
- No icon set — glyphs used are `★ ▶ ‹ ↻ ● ✕ ⚡ 🔒`. Replace the lock and bolt with real icons; the rest are type.

## Files
| File | What it is |
| --- | --- |
| `Bardown Hero Final.dc.html` | **Start here.** All 8 screens, annotated, with tokens and build order. |
| `Bardown Hero UI.dc.html` | Full exploration: turn 0 recreates the CURRENT UI for comparison; turns 1–3 are the directions that led here. |
| `ios-frame.jsx`, `image-slot.js`, `support.js` | Support files so the two HTML files open offline. |

## Build order
1. **Venue model** — add venue + star gate to each chapter in `src/content/levels.ts`. Nothing else lands without it.
2. **Map screen** — replace the Campaign list in `src/ui.tsx`. Star rings via `react-native-svg`.
3. **Level card** — modal scaling from the tapped node.
4. **HUD + result** — strip the bottom slab in `App.tsx`; power moves into the button ring.
5. **Career screens** — restyle locker + medals in `src/progressionUI.tsx`. Presentation only, no logic change.
6. **Venue art** — commission six backdrops; geometry ships until then.

No new dependencies beyond `react-native-svg` (already used) and `expo-font`.
