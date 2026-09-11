// Rink coordinates: x across the ice, z toward the camera. Attack toward -z.
export type Point = { x: number; z: number; height?: number; bounce?: boolean };
export const BOARD_X = 10.75;
export const BOARD_Z = 22.5;
export type Phase = 'AUTO_PLAY' | 'PAUSED_FOR_INPUT' | 'EXECUTING_ACTION' | 'REBOUND' | 'SUCCESS' | 'FAIL';
export type Intent = { kind: 'pass'; target: number } | { kind: 'shot' } | { kind: 'loose' };
export const NET_Z = -18;
export const NET_HALF_WIDTH = 3.05;
export const NET_HEIGHT = 4.4;
export const GOAL_CORNERS = [
  { x: -2.25, z: NET_Z, height: 0.55, label: 'LOW LEFT' },
  { x: 2.25, z: NET_Z, height: 0.55, label: 'LOW RIGHT' },
  { x: -2.25, z: NET_Z, height: 3.5, label: 'HIGH LEFT' },
  { x: 2.25, z: NET_Z, height: 3.5, label: 'HIGH RIGHT' },
] as const;
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, ...(a.height !== undefined || b.height !== undefined ? { height: (a.height ?? 0) + ((b.height ?? 0) - (a.height ?? 0)) * t } : {}) });
const copy = (p: Point): Point => ({ ...p });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const SKATER_SPACING = 1.85;
export const DEFAULT_RECEPTION = {
  pickupRadius: 0.9, pursuitRadius: 6, skateSpeed: 7,
  assistRadius: 1.4, assistStrength: 0.18, maxAssist: 0.2,
  coastDrag: 16, looseTimeout: 2.2, boardRetention: 0.84,
};
export type ReceptionConfig = typeof DEFAULT_RECEPTION;
// Keep the receiver fixed and give everyone else a distinct patch of ice.
// The same small constraint is applied along routes, not only at their ends.
export function spaceSkaters(points: Point[], pinned: number): Point[] {
  const result = points.map(copy);
  for (let iteration = 0; iteration < 24; iteration++) {
    let adjusted = false;
    for (let i = 0; i < result.length; i++) for (let j = i + 1; j < result.length; j++) {
      const a = result[i], b = result[j], d = distance(a, b);
      if (d >= SKATER_SPACING - 0.00001) continue;
      let dx = d > 0.00001 ? (b.x - a.x) / d : Math.cos((i * 5 + j) * 2.399);
      let dz = d > 0.00001 ? (b.z - a.z) / d : Math.sin((i * 5 + j) * 2.399);
      const push = SKATER_SPACING - d + 0.0001;
      const shareA = i === pinned ? 0 : j === pinned ? 1 : 0.5;
      const shareB = 1 - shareA;
      // At the boards, separate along the ice instead of pushing into a wall.
      if (Math.abs(dz) < 0.25 && (Math.abs(a.x - dx * push * shareA) > 9.6 || Math.abs(b.x + dx * push * shareB) > 9.6)) {
        dx = 0; dz = b.z >= a.z ? 1 : -1;
      }
      a.x = clamp(a.x - dx * push * shareA, -9.6, 9.6);
      a.z = clamp(a.z - dz * push * shareA, -15.5, 21);
      b.x = clamp(b.x + dx * push * shareB, -9.6, 9.6);
      b.z = clamp(b.z + dz * push * shareB, -15.5, 21);
      adjusted = true;
    }
    if (!adjusted) break;
  }
  return result;
}

export const MOMENTS = [
  { title: 'THE BREAKOUT', instruction: 'Drag anywhere. Guide the puck path to a teal teammate.', carrier: { x: -4, z: 12 }, support: [{ x: 6, z: 4 }, { x: -6, z: -4 }], defense: [{ x: -1, z: 2 }, { x: 2, z: -10 }] },
  { title: 'BEND THE RULES', instruction: 'Curve around the red defender to your teammate.', carrier: { x: 6, z: 3 }, support: [{ x: -6, z: -7 }, { x: 7, z: -10 }], defense: [{ x: 0, z: -2 }, { x: 6.5, z: -5.8 }] },
  { title: 'PICK YOUR CORNER', instruction: 'Aim high or low into a gold corner. Red is covered.', carrier: { x: -4, z: -10 }, support: [{ x: 7, z: -10 }, { x: -7, z: -14 }], defense: [{ x: -1, z: -4 }, { x: 4, z: -6 }] },
] as const;

export type Powerup = 'fire' | 'curve' | 'freeze';
type Moment = { title: string; instruction: string; carrier: Point; support: readonly Point[]; defense: readonly Point[]; powerup?: Powerup };
type Level = { title: string; moments: readonly Moment[] };
export const LEVELS: readonly Level[] = [
  { title: 'THE OPENING RUSH', moments: MOMENTS },
  { title: 'AROUND THE STICK', moments: [
    { title: 'HOOK THE PASS', instruction: 'Bend left of the defender, then into the far teammate.', carrier: { x: -6, z: 6 }, support: [{ x: 5, z: -6 }, { x: -7, z: -9 }], defense: [{ x: -0.5, z: 0 }, { x: -6.5, z: -2 }] },
    { title: 'FAR CORNER', instruction: 'Finish the rush with a corner shot.', carrier: { x: 5, z: -10 }, support: [{ x: -6, z: -10 }, { x: 7, z: -13 }], defense: [{ x: -2, z: -6 }, { x: 0, z: -12 }] },
  ] },
  { title: 'CROSS-ICE ONE-TIMER', moments: [
    { title: 'ACROSS THE SLOT', instruction: 'Send it across to the right wing. Be ready to shoot.', carrier: { x: -7, z: -10 }, support: [{ x: 7, z: -10 }, { x: -5, z: -5 }], defense: [{ x: 0, z: -7 }, { x: -2, z: -14 }] },
    { title: 'HIT IT FIRST TIME', instruction: 'No skating delay. Swipe into the near corner.', carrier: { x: 7, z: -10 }, support: [{ x: -7, z: -10 }, { x: -5, z: -5 }], defense: [{ x: 0, z: -7 }, { x: -2, z: -14 }] },
  ] },
  { title: 'TWO CLOSED LANES', moments: [
    { title: 'SPLIT THE COVERAGE', instruction: 'Both straight lanes are blocked. Loop outside to a wing.', carrier: { x: 0, z: 8 }, support: [{ x: -7, z: -2 }, { x: 7, z: -2 }], defense: [{ x: -3.5, z: 3 }, { x: 3.5, z: 3 }] },
    { title: 'SWITCH SIDES', instruction: 'Curl below the red jerseys and find the opposite wing.', carrier: { x: -7, z: -3 }, support: [{ x: 7, z: -9 }, { x: -7, z: -12 }], defense: [{ x: 0, z: -6 }, { x: -7, z: -7.5 }] },
    { title: 'AROUND TRAFFIC', instruction: 'Bend outside the defender and back inside the right post.', carrier: { x: 6, z: -9 }, support: [{ x: -7, z: -10 }, { x: 8, z: -5 }], defense: [{ x: 4, z: -13.5 }, { x: -1, z: -12 }] },
  ] },
  { title: 'SAVE & SCRAMBLE', moments: [
    { title: 'SET UP THE SAVE', instruction: 'Feed the slot. Crash the crease for the second chance.', carrier: { x: -6, z: -5 }, support: [{ x: 0, z: -10 }, { x: 7, z: -9 }], defense: [{ x: -5, z: -12 }, { x: 5, z: -6 }] },
    { title: 'TEST THE PADS', instruction: 'Shoot at the goalie for a guided rebound, then pick a corner.', carrier: { x: 0, z: -10 }, support: [{ x: 6, z: -11.5 }, { x: -7, z: -10 }], defense: [{ x: -5, z: -13 }, { x: 5, z: -6 }] },
  ] },
  { title: 'BREAKAWAY HEAT', moments: [
    { title: 'SPRING THE WINGER', instruction: 'Lead the right wing into open ice.', carrier: { x: -5, z: 2 }, support: [{ x: 5, z: -10 }, { x: -7, z: -8 }], defense: [{ x: -8, z: 5 }, { x: 8, z: 4 }] },
    { title: 'LIGHT THE LAMP', instruction: 'Tap FIRE PUCK, then rip a shot into a corner.', carrier: { x: 5, z: -10 }, support: [{ x: -5, z: -9 }, { x: -7, z: -5 }], defense: [{ x: -8, z: 2 }, { x: 8, z: 1 }], powerup: 'fire' },
  ] },
  { title: 'THE BIG BENDER', moments: [
    { title: 'LOAD THE SLINGSHOT', instruction: 'Feed the left wing for a ridiculous finish.', carrier: { x: 6, z: 1 }, support: [{ x: -6, z: -10 }, { x: 7, z: -8 }], defense: [{ x: -8, z: 4 }, { x: 8, z: 5 }] },
    { title: 'BEND SPACE', instruction: 'Tap MEGA CURVE. Draw a bend; the preview amplifies it.', carrier: { x: -6, z: -10 }, support: [{ x: 6, z: -7 }, { x: -8, z: -5 }], defense: [{ x: -8, z: 2 }, { x: 8, z: 1 }], powerup: 'curve' },
  ] },
  { title: 'COLD SNAP', moments: [
    { title: 'ICE THE DEFENSE', instruction: 'Tap FREEZE to hold the defenders. Pass through the middle.', carrier: { x: -6, z: 2 }, support: [{ x: 5, z: -9 }, { x: -7, z: -9 }], defense: [{ x: -4, z: -5 }, { x: 4, z: 2 }], powerup: 'freeze' },
    { title: 'THAW THE NET', instruction: 'Finish high before the goalie gets across.', carrier: { x: 5, z: -9 }, support: [{ x: -6, z: -8 }, { x: 7, z: -4 }], defense: [{ x: -7, z: -3 }, { x: 7, z: 1 }] },
  ] },
  { title: 'NEEDLE & THREAD', moments: [
    { title: 'THE NARROW WINDOW', instruction: 'Thread the middle between two red jerseys.', carrier: { x: 0, z: 6 }, support: [{ x: 0, z: -6 }, { x: -7, z: -8 }], defense: [{ x: -2, z: 0 }, { x: 2, z: 0 }] },
    { title: 'SEND IT WIDE', instruction: 'Find the left wing, then bring it home.', carrier: { x: 0, z: -6 }, support: [{ x: -7, z: -10 }, { x: 7, z: -9 }], defense: [{ x: -3, z: 1 }, { x: 3, z: 1 }] },
    { title: 'SHELF SERVICE', instruction: 'Pick a high corner from the wing.', carrier: { x: -7, z: -10 }, support: [{ x: 0, z: -7 }, { x: 7, z: -9 }], defense: [{ x: -4, z: -3 }, { x: 4, z: -3 }] },
  ] },
  { title: 'LIGHTS OUT FINAL', moments: [
    { title: 'WIN THE ENTRY', instruction: 'Freeze the coverage and find the right wing.', carrier: { x: -5, z: 8 }, support: [{ x: 6, z: 0 }, { x: -7, z: -5 }], defense: [{ x: -6, z: 2 }, { x: 4, z: -5 }], powerup: 'freeze' },
    { title: 'CROSS THE ICE', instruction: 'Swing a pass across to the left wing.', carrier: { x: 6, z: 0 }, support: [{ x: -6, z: -8 }, { x: 7, z: -10 }], defense: [{ x: -7, z: 3 }, { x: 7, z: 3 }] },
    { title: 'THE LAST FEED', instruction: 'Send it right for the final one-timer.', carrier: { x: -6, z: -8 }, support: [{ x: 6, z: -11 }, { x: -8, z: -3 }], defense: [{ x: -7, z: 2 }, { x: 7, z: 2 }] },
    { title: 'BRING THE HEAT', instruction: 'Fire Puck is ready. End this with a high-corner rocket.', carrier: { x: 6, z: -11 }, support: [{ x: -6, z: -8 }, { x: -8, z: -3 }], defense: [{ x: -7, z: 2 }, { x: 7, z: 2 }], powerup: 'fire' },
  ] },
  { title: 'INTO THE GAP', moments: [
    { title: 'LEAD THE RUSH', instruction: 'Send it ahead of the right wing. Let them skate onto it.', carrier: { x: -5, z: 5 }, support: [{ x: 5, z: -3 }, { x: -7, z: -8 }], defense: [{ x: -7, z: 2 }, { x: 8, z: 4 }] },
    { title: 'CATCH & RELEASE', instruction: 'Collected in stride. Rip a high corner.', carrier: { x: 5, z: -7 }, support: [{ x: -5, z: -6 }, { x: -7, z: -10 }], defense: [{ x: -8, z: 2 }, { x: 8, z: 1 }] },
  ] },
  { title: 'RIM & RIP', moments: [
    { title: 'USE THE WALL', instruction: 'Bank off the right boards toward the waiting wing.', carrier: { x: -4, z: 10 }, support: [{ x: 6, z: -5 }, { x: -7, z: -7 }], defense: [{ x: -3, z: -1 }, { x: -7, z: 5 }] },
    { title: 'ACROSS THE SEAM', instruction: 'Switch to the left wing for the finish.', carrier: { x: 6, z: 2 }, support: [{ x: -6, z: -10 }, { x: 7, z: -9 }], defense: [{ x: -8, z: 4 }, { x: 8, z: 5 }] },
    { title: 'RIP IT HOME', instruction: 'High corner. Make the boards your best assist.', carrier: { x: -6, z: -10 }, support: [{ x: 6, z: -6 }, { x: 8, z: -10 }], defense: [{ x: -8, z: 3 }, { x: 8, z: 3 }] },
  ] },
  { title: 'DOUBLE TAKE', moments: [
    { title: 'SELL THE FAKE', instruction: 'Two receivers. Curl outside the coverage to either wing.', carrier: { x: 0, z: 6 }, support: [{ x: -7, z: -3 }, { x: 7, z: -3 }], defense: [{ x: -3, z: 1 }, { x: 3, z: 1 }] },
    { title: 'SWITCH THE PLAY', instruction: 'Find the opposite wing. Make the goalie turn twice.', carrier: { x: -7, z: -3 }, support: [{ x: 7, z: -10 }, { x: -7, z: -11 }], defense: [{ x: -3, z: 2 }, { x: 3, z: 2 }] },
    { title: 'ONE TOUCH', instruction: 'Catch, shoot, celebrate. Pick a high corner.', carrier: { x: 7, z: -10 }, support: [{ x: -7, z: -10 }, { x: 0, z: -6 }], defense: [{ x: -4, z: -3 }, { x: 4, z: -3 }] },
  ] },
  { title: 'SECOND HELPING', moments: [
    { title: 'FEED THE CREASE', instruction: 'Find the center. A pad save is your invitation.', carrier: { x: -7, z: -3 }, support: [{ x: 0, z: -10 }, { x: 7, z: -10 }], defense: [{ x: -7, z: -12 }, { x: 6, z: -3 }] },
    { title: 'CRASH THE NET', instruction: 'Shoot low at the pads, then bury the rebound upstairs.', carrier: { x: 0, z: -10 }, support: [{ x: 6, z: -11.5 }, { x: -7, z: -10 }], defense: [{ x: -6, z: -13 }, { x: 6, z: -3 }] },
  ] },
  { title: 'THROUGH THE CROWD', moments: [
    { title: 'DRAW THEM IN', instruction: 'Slip a pass to the right wing.', carrier: { x: -6, z: 4 }, support: [{ x: 6, z: -5 }, { x: -7, z: -7 }], defense: [{ x: -6, z: -2 }, { x: 0, z: -8 }] },
    { title: 'FIND THE SHOOTER', instruction: 'Curl across the slot to the left wing.', carrier: { x: 6, z: -5 }, support: [{ x: -6, z: -9 }, { x: 7, z: -12 }], defense: [{ x: 0, z: -9 }, { x: 4, z: -12 }] },
    { title: 'BEND IT LATE', instruction: 'Loop outside the screen, then cut back inside the post.', carrier: { x: -6, z: -9 }, support: [{ x: 6, z: -10 }, { x: 7, z: -6 }], defense: [{ x: -3, z: -13 }, { x: 2, z: -12 }] },
  ] },
  { title: 'THE ENCORE', moments: [
    { title: 'OFF THE WALL', instruction: 'Bank right. Start your final highlight with a bounce.', carrier: { x: -4, z: 10 }, support: [{ x: 6, z: -5 }, { x: -7, z: -6 }], defense: [{ x: -3, z: -1 }, { x: -7, z: 5 }] },
    { title: 'CHASE THE SPACE', instruction: 'Lead the left wing deeper into the zone.', carrier: { x: 6, z: 2 }, support: [{ x: -6, z: -5 }, { x: 7, z: -10 }], defense: [{ x: -8, z: 4 }, { x: 8, z: 5 }] },
    { title: 'THE FINAL FEED', instruction: 'Cross-ice to the right wing. One last touch.', carrier: { x: -6, z: -9 }, support: [{ x: 6, z: -11 }, { x: -8, z: -3 }], defense: [{ x: -7, z: 2 }, { x: 7, z: 2 }] },
    { title: 'TAKE A BOW', instruction: 'Light up Fire Puck. Send the crowd home happy.', carrier: { x: 6, z: -11 }, support: [{ x: -6, z: -8 }, { x: -8, z: -3 }], defense: [{ x: -7, z: 2 }, { x: 7, z: 2 }], powerup: 'fire' },
  ] },
];

export const CHAPTERS = ['FIRST TRACKS', 'HEAT CHECK', 'PLAYMAKERS', 'HIGHLIGHT REEL'];
export const HIGHLIGHTS = [
  'Break out. Bend it. Bury it.', 'A hook pass with bad intentions.', 'Across the ice. Off the blade.', 'Two closed lanes. Find a third.',
  'The second chance is the best chance.', 'Open ice. A puck on fire.', 'A finish that bends the rules.', 'Freeze the lane. Heat up the net.',
  'A pass through the smallest window.', 'Four touches. Lights out.', 'Put it where they’re going.', 'The boards get the assist.',
  'Two wings. One very confused goalie.', 'A pad save is just the beginning.', 'Make your own shooting lane.', 'Bank. Chase. Cross. Bury.',
];
export type Objective = 'goal' | 'top' | 'curve' | 'passes' | 'rebound' | 'fire' | 'freeze' | 'bank' | 'lead';
export const OBJECTIVES: readonly (readonly Objective[])[] = [
  ['goal', 'passes', 'top'], ['goal', 'curve', 'top'], ['goal', 'passes', 'top'],
  ['goal', 'curve', 'passes'], ['goal', 'rebound', 'top'], ['goal', 'fire', 'top'],
  ['goal', 'curve', 'top'], ['goal', 'freeze', 'top'], ['goal', 'passes', 'top'], ['goal', 'fire', 'freeze'],
  ['goal', 'lead', 'top'], ['goal', 'bank', 'passes'], ['goal', 'curve', 'passes'],
  ['goal', 'rebound', 'top'], ['goal', 'curve', 'top'], ['goal', 'bank', 'lead'],
];
export const OBJECTIVE_LABELS: Record<Objective, string> = {
  goal: 'Score a goal', top: 'Go top shelf', curve: 'Land a curved play',
  passes: 'Make every setup pass', rebound: 'Bury a rebound', fire: 'Score with Fire Puck', freeze: 'Make a frozen play',
  bank: 'Complete a bank pass', lead: 'Lead a skater into space',
};

// Translate the gesture in screen space before projecting onto the ice.
// This preserves the visible shape even when the finger starts below the puck.
export function relativeAim(anchor: { x: number; y: number }, dx: number, dy: number) {
  return { x: anchor.x + dx, y: anchor.y + dy };
}

export function cleanPath(raw: Point[], end?: Point): Point[] {
  if (!raw.length) return [];
  const points = [copy(raw[0])];
  for (let i = 1; i < raw.length; i++) {
    if (distance(points[points.length - 1], raw[i]) > 0.12) points.push(copy(raw[i]));
  }
  if (points.length === 1) points.push(copy(raw[raw.length - 1]));
  // Very light smoothing: retain loops, giant bends, and the player's shape.
  const smooth = points.map((p, i) => i === 0 || i === points.length - 1 ? p : mix(p, mix(points[i - 1], points[i + 1], 0.5), 0.12));
  if (end) {
    const delta = { x: end.x - smooth[smooth.length - 1].x, z: end.z - smooth[smooth.length - 1].z };
    // Assistance only bends the final quarter of a pass, never straightens it.
    for (let i = 1; i < smooth.length; i++) {
      const weight = Math.pow(Math.max(0, (i / (smooth.length - 1) - 0.75) * 4), 2);
      smooth[i] = { x: smooth[i].x + delta.x * weight, z: smooth[i].z + delta.z * weight };
    }
  }
  return smooth;
}

export function boardHit(a: Point, b: Point): { point: Point; t: number; flipX: boolean; flipZ: boolean } | null {
  let t = Infinity;
  for (const [axis, half] of [['x', BOARD_X], ['z', BOARD_Z]] as const) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-9) continue;
    const wall = delta > 0 ? half : -half;
    if ((delta > 0 && b[axis] < wall - 1e-7) || (delta < 0 && b[axis] > wall + 1e-7)) continue;
    const candidate = (wall - a[axis]) / delta;
    if (candidate >= -1e-9 && candidate <= 1 + 1e-9) t = Math.min(t, Math.max(0, candidate));
  }
  if (!Number.isFinite(t)) return null;
  const point = mix(a, b, t);
  const flipX = Math.abs(Math.abs(point.x) - BOARD_X) < 1e-7;
  const flipZ = Math.abs(Math.abs(point.z) - BOARD_Z) < 1e-7;
  point.x = flipX ? Math.sign(point.x) * BOARD_X : clamp(point.x, -BOARD_X, BOARD_X);
  point.z = flipZ ? Math.sign(point.z) * BOARD_Z : clamp(point.z, -BOARD_Z, BOARD_Z);
  return { point: { ...point, bounce: true }, t, flipX, flipZ };
}

// A preview ends at its first board contact. Nothing beyond it is user-authored.
export function bankPath(raw: Point[]): Point[] {
  if (!raw.length || raw.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.z))) return [];
  const result = [copy(raw[0])];
  for (let i = 1; i < raw.length; i++) {
    const hit = boardHit(raw[i - 1], raw[i]);
    result.push(hit ? hit.point : copy(raw[i]));
    if (hit) break;
    if (result.length >= 512) break;
  }
  return result;
}

export class Game {
  readonly levelIndex: number;
  readonly reception: ReceptionConfig;
  constructor(levelIndex = 0, reception: Partial<ReceptionConfig> = {}) {
    this.reception = { ...DEFAULT_RECEPTION, ...reception };
    this.levelIndex = Number.isInteger(levelIndex) && LEVELS[levelIndex] ? levelIndex : 0;
    this.goalieGlove = { ...this.coveredCorner, z: this.goalie.z };
    if (this.levelIndex !== 0) {
      const first = this.level.moments[0];
      this.attackers = [first.carrier, ...first.support].map(p => ({ x: p.x, z: p.z + 3 }));
      this.defenders = first.defense.map(p => ({ x: p.x, z: p.z + 2 }));
      this.puck = copy(this.attackers[0]);
      this.fromAttack = this.attackers.map(copy);
      this.fromDefense = this.defenders.map(copy);
    }
  }
  get level() { return LEVELS[this.levelIndex]; }
  get moment() { return this.level.moments[this.stage]; }
  get coveredCorner() { return GOAL_CORNERS[(this.levelIndex + this.stage + (this.reboundUsed ? 2 : 0)) % GOAL_CORNERS.length]; }
  cornerCovered(p: Point) { return this.goalieCovers(p); }
  phase: Phase = 'AUTO_PLAY';
  introRemaining = 0;
  startPreview() { if (this.phase === 'AUTO_PLAY' && this.stage === 0) this.introRemaining = 3; }
  stage = 0;
  carrier = 0;
  attackers: Point[] = [{ x: -4, z: 18 }, { x: 6, z: 12 }, { x: -6, z: 4 }];
  defenders: Point[] = [{ x: -1, z: 7 }, { x: 2, z: -5 }];
  goalie: Point = { x: 0, z: -17.25 };
  goalieGlove: Point = { x: -2.25, z: -17.25, height: 0.55 };
  goalieVelocity = 0;
  private goalieGloveVelocity = { x: 0, height: 0 };
  private goalieShotTime = 0;
  private goalieRecovery = 0;
  puck: Point = copy(this.attackers[0]);
  preview: Point[] = [];
  path: Point[] = [];
  trail: Point[] = [];
  intent: Intent = { kind: 'loose' };
  reboundUsed = false;
  elapsed = 0;
  motion = 0;
  impact = 0;
  eventId = 0;
  event = '';
  callout = '';
  terminalTime = 0;
  armed: Powerup | null = null;
  actionPower: Powerup | null = null;
  private usedPowerups = new Set<string>();
  passes = 0;
  bankPasses = 0;
  leadPasses = 0;
  private actionBanked = false;
  curvedActions = 0;
  frozenActions = 0;
  goalHeight = 0;
  private actionCurved = false;
  get availablePowerup() { return this.paused && !this.reboundUsed && !this.usedPowerups.has(String(this.stage)) ? this.moment.powerup : undefined; }
  activatePowerup() {
    if (!this.availablePowerup || this.armed) return;
    this.armed = this.availablePowerup;
    this.cancel();
  }
  get objectives() {
    return OBJECTIVES[this.levelIndex].map(id => ({ id, label: OBJECTIVE_LABELS[id], complete: this.phase === 'SUCCESS' && (
      id === 'goal' || id === 'top' && this.goalHeight >= 3 || id === 'curve' && this.curvedActions > 0 ||
      id === 'passes' && this.passes >= this.level.moments.length - 1 || id === 'rebound' && this.reboundUsed ||
      id === 'fire' && this.actionPower === 'fire' || id === 'freeze' && this.frozenActions > 0 ||
      id === 'bank' && this.bankPasses > 0 || id === 'lead' && this.leadPasses > 0
    ) }));
  }
  message = 'Here comes the rush…';
  private routeTime = 0;
  private fromAttack = this.attackers.map(copy);
  private fromDefense = this.defenders.map(copy);
  private segment = 0;
  private segmentOffset = 0;
  private speed = 22;
  private actionDistance = 0;
  private actionLength = 1;
  private actionTime = 0;
  private freeVelocity: Point | null = null;
  private looseTime = 0;
  private pickupPlans: (Point | null)[] = [null, null, null];
  private pickupReplan = 0;
  private lastHeading: Point = { x: 0, z: -1 };
  private toDefense: Point[] = [];
  private toAttack: Point[] = [];
  private reboundStart: Point = { x: 0, z: 0 };
  private reboundEnd: Point = { x: 6, z: -11 };

  get targets() { return this.attackers.map((p, i) => ({ ...p, id: i })).filter(p => p.id !== this.carrier); }
  get paused() { return this.phase === 'PAUSED_FOR_INPUT'; }
  get terminal() { return this.phase === 'SUCCESS' || this.phase === 'FAIL'; }

  classify(end: Point): Intent {
    // The net zone takes precedence over an adjacent teammate.
    if (end.z <= -16.2) return { kind: 'shot' };
    const nearest = this.targets.sort((a, b) => distance(a, end) - distance(b, end))[0];
    if (nearest && distance(nearest, end) < 2.3) return { kind: 'pass', target: nearest.id };
    return { kind: 'loose' };
  }

  aim(raw: Point[]) {
    if (!this.paused || !raw.length) return;
    if (raw.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.z))) { this.cancel(); return; }
    // Clip before smoothing so hidden strokes beyond the board cannot alter
    // the approach angle or steer the later rebound.
    let stroke = bankPath([copy(this.puck), ...raw.slice(1)]);
    const banking = !!stroke[stroke.length - 1]?.bounce;
    const target = stroke[stroke.length - 1];
    if (!target) { this.cancel(); return; }
    this.intent = banking ? { kind: 'loose' } : this.classify(target);
    let end: Point | undefined;
    if (!banking && this.intent.kind === 'pass') {
      const teammate = this.attackers[this.intent.target], miss = distance(target, teammate);
      if (miss > this.reception.pickupRadius && miss < this.reception.assistRadius) {
        end = mix(target, teammate, Math.min(this.reception.maxAssist / miss, this.reception.assistStrength));
      }
    }
    if (this.intent.kind === 'shot' && target.height !== undefined) {
      // Dragging around the goal face adjusts the destination, rather than
      // executing an earlier crossing of the goal line at the wrong height.
      const enteredNet = stroke.findIndex((p, i) => i > 0 && p.height !== undefined);
      if (enteredNet > 0) stroke = [...stroke.slice(0, enteredNet), target];
    }
    this.preview = cleanPath([copy(this.puck), ...stroke.slice(1).map(p => ({ x: p.x, z: p.z }))], end);
    if (this.armed === 'curve' && this.preview.length > 2) {
      const start = this.preview[0], finish = this.preview[this.preview.length - 1];
      this.preview = this.preview.map((p, i, a) => {
        const baseline = mix(start, finish, i / (a.length - 1));
        return { ...p, x: baseline.x + (p.x - baseline.x) * 1.8, z: baseline.z + (p.z - baseline.z) * 1.8 };
      });
    }
    this.preview = bankPath(this.preview);
    if (this.preview[this.preview.length - 1]?.bounce) this.intent = { kind: 'loose' };
    if (this.intent.kind === 'shot' && target.height !== undefined) {
      const total = this.preview.reduce((sum, p, i, a) => sum + (i ? distance(a[i - 1], p) : 0), 0);
      let traveled = 0;
      this.preview = this.preview.map((p, i, a) => {
        if (i) traveled += distance(a[i - 1], p);
        return i === 0 ? p : { ...p, height: i === a.length - 1 ? target.height! : target.height! * traveled / Math.max(total, 0.001) };
      });
    }
  }

  cancel() {
    this.preview = [];
    // A canceled finger gesture must never erase an action already in flight.
    if (this.phase !== 'EXECUTING_ACTION') this.intent = { kind: 'loose' };
  }

  release(raw: Point[], seconds = 1) {
    if (!this.paused) return;
    if (raw.length < 2) { this.cancel(); return; }
    this.aim(raw);
    const length = this.preview.reduce((sum, p, i, a) => sum + (i ? distance(a[i - 1], p) : 0), 0);
    if (length < 1) { this.cancel(); return; }
    if (this.armed === 'fire' && this.intent.kind !== 'shot') {
      this.cancel(); this.message = 'Fire Puck needs a shot. Finish your swipe in the net.'; return;
    }
    this.actionPower = this.armed;
    this.actionBanked = false;
    if (this.armed) this.usedPowerups.add(String(this.stage));
    this.armed = null;
    const start = this.preview[0], end = this.preview[this.preview.length - 1];
    const direct = distance(start, end);
    // Recognize visible lateral bends as well as loops; a useful hook need not
    // add a large percentage to a long cross-ice pass.
    this.actionCurved = this.preview.some(p => Math.abs((p.x - start.x) * (end.z - start.z) - (p.z - start.z) * (end.x - start.x)) / Math.max(direct, 0.01) >= 1.5)
      || length > direct * 1.12 + 0.6;
    this.path = this.preview.map(copy);
    // Shots ending just in front of the net continue on their final heading.
    if (this.intent.kind === 'shot') {
      const end = this.path[this.path.length - 1];
      const prev = this.path[this.path.length - 2];
      if (end.z > NET_Z && end.z < prev.z) {
        const t = (NET_Z - end.z) / (end.z - prev.z);
        this.path.push({ x: end.x + (end.x - prev.x) * t, z: NET_Z });
      }
    }
    this.preview = [];
    this.segment = 0;
    this.segmentOffset = 0;
    this.speed = 23 + clamp(length / Math.max(seconds, 0.1) / 20, 0, 5);
    if (this.actionPower === 'fire') this.speed *= 2.8;
    this.actionDistance = 0;
    this.actionTime = 0;
    this.freeVelocity = null;
    this.looseTime = 0;
    this.pickupReplan = 0;
    this.goalieShotTime = 0;
    this.actionLength = this.path.reduce((sum, p, i, a) => sum + (i ? distance(a[i - 1], p) : 0), 0);
    this.fromDefense = this.defenders.map(copy);
    this.fromAttack = this.attackers.map(copy);
    const next = this.level.moments[Math.min(this.stage + 1, this.level.moments.length - 1)];
    // Short authored routes, capped to a readable skating speed. Identical
    // setups still get a small lateral slide instead of motionless defenders.
    this.toDefense = this.defenders.map((p, i) => {
      const destination = next.defense[i];
      return distance(p, destination) > 0.1 ? copy(destination) : { x: clamp(p.x + (i === 0 ? 1 : -1), -9, 9), z: p.z - 0.4 };
    });
    const receiver = this.intent.kind === 'pass' ? this.intent.target : this.carrier;
    const others = [0, 1, 2].filter(i => i !== receiver);
    this.toAttack = this.attackers.map((p, i) => this.intent.kind === 'pass' && i !== receiver ? copy(next.support[others.indexOf(i)]) : copy(p));
    this.toAttack = spaceSkaters(this.toAttack, receiver);
    this.planReception(this.path, this.speed);
    this.phase = 'EXECUTING_ACTION';
    this.message = this.intent.kind === 'pass' ? 'THREAD IT.' : this.intent.kind === 'shot' ? 'LET IT RIP.' : 'INTO SPACE.';
    this.callout = this.actionPower === 'fire' ? 'FIRE PUCK!' : this.actionPower === 'curve' ? 'MEGA CURVE!' : this.actionPower === 'freeze' ? 'ICE COLD!' : '';
    this.emit('release', this.actionPower === 'fire' ? 1.6 : 0.35);
  }

  private emit(event: string, impact = 1) { this.event = event; this.eventId++; this.impact = impact; }
  private fail(message: string) { this.phase = 'FAIL'; this.message = message; this.emit('fail'); }

  update(realDt: number) {
    // Freeze includes the camera, players, particles, goalie, and simulation clock.
    if (this.paused) return;
    const dt = Number.isFinite(realDt) ? clamp(realDt, 0, 0.05) : 0;
    if (this.introRemaining > 0) { this.introRemaining = Math.max(0, this.introRemaining - dt); return; }
    const slow = (this.phase === 'EXECUTING_ACTION' && this.puck.z < -14) || this.phase === 'REBOUND' ? 0.42 : 1;
    this.elapsed += dt;
    this.motion += dt * (this.phase === 'SUCCESS' ? 0.35 : slow);
    this.impact = Math.max(0, this.impact - dt * 1.8);
    if (this.terminal) { this.terminalTime += dt; return; }
    if (this.phase === 'AUTO_PLAY') {
      this.routeTime += dt;
      const t = Math.min(1, this.routeTime / 1.15);
      const ease = t * t * (3 - 2 * t);
      const moment = this.moment;
      const others = [0, 1, 2].filter(i => i !== this.carrier);
      this.attackers = this.attackers.map((_, i) => mix(this.fromAttack[i], i === this.carrier ? moment.carrier : moment.support[others.indexOf(i)], ease));
      this.defenders = this.defenders.map((_, i) => mix(this.fromDefense[i], moment.defense[i], ease));
      this.separateSkaters(this.carrier);
      this.puck = copy(this.attackers[this.carrier]);
      if (t === 1) { this.phase = 'PAUSED_FOR_INPUT'; this.impact = 0; this.trail = []; this.message = moment.instruction; this.emit('freeze', 0); }
      return;
    }
    if (this.phase === 'REBOUND') {
      this.routeTime += dt * slow;
      const t = Math.min(1, this.routeTime / 0.8);
      const p = mix(this.reboundStart, this.reboundEnd, t);
      p.x += Math.sin(t * Math.PI) * 1.6;
      this.puck = p;
      this.moveGoalie(dt * slow);
      this.addTrail();
      this.attackers[this.carrier] = mix(this.fromAttack[this.carrier], this.reboundEnd, t);
      this.separateSkaters(this.carrier);
      if (t === 1) { this.puck = copy(this.attackers[this.carrier]); this.phase = 'PAUSED_FOR_INPUT'; this.trail = []; this.impact = 0; this.message = 'REBOUND! Aim for a gold corner. One more chance.'; this.emit('freeze', 0); }
      return;
    }
    let remaining = dt * slow;
    // Swept substeps prevent fast shots tunneling through defenders or the goalie.
    while (remaining > 0.000001 && this.phase === 'EXECUTING_ACTION') {
      const a = this.path[this.segment];
      const b = this.path[this.segment + 1];
      if (!this.freeVelocity && !b) { this.finishPath(); continue; }
      const length = b && a ? distance(a, b) : 0;
      if (!this.freeVelocity && length < 0.0001) { this.segment++; this.segmentOffset = 0; continue; }
      const previous = this.puck;
      let step: number, stepDt: number;
      let hit: ReturnType<typeof boardHit> = null;
      if (this.freeVelocity) {
        const speed = distance(this.freeVelocity, { x: 0, z: 0 });
        stepDt = Math.min(remaining, 0.02, 0.12 / Math.max(speed, 0.1));
        const nextSpeed = Math.max(0, speed - this.reception.coastDrag * stepDt);
        const travel = (speed + nextSpeed) * 0.5 * stepDt;
        const direction = speed > 0 ? { x: this.freeVelocity.x / speed, z: this.freeVelocity.z / speed } : { x: 0, z: 0 };
        const next = { x: previous.x + direction.x * travel, z: previous.z + direction.z * travel };
        hit = boardHit(previous, next);
        if (hit) stepDt *= hit.t;
        this.puck = hit ? { x: hit.point.x, z: hit.point.z } : next;
        const slowed = Math.max(0, speed - this.reception.coastDrag * stepDt);
        this.freeVelocity = { x: direction.x * slowed, z: direction.z * slowed };
        step = distance(previous, this.puck);
        this.looseTime += stepDt;
      } else {
        step = Math.min(this.speed * remaining, 0.12, length - this.segmentOffset);
        stepDt = step / this.speed;
        this.segmentOffset += step;
        this.puck = mix(a, b, this.segmentOffset / length);
        this.lastHeading = { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
      }
      remaining -= stepDt;
      this.actionDistance += step;
      this.actionTime += stepDt;
      const flightTime = this.actionTime;
      this.defenders = this.fromDefense.map((p, i) => this.actionPower === 'freeze' ? copy(p) : mix(p, this.toDefense[i], Math.min(1, flightTime * 4 / Math.max(0.001, distance(p, this.toDefense[i])))));
      this.moveReceivers(stepDt);
      const pursuing = this.targets.filter(p => this.pickupPlans[p.id]).sort((p, q) => distance(p, this.puck) - distance(q, this.puck))[0];
      this.separateSkaters(pursuing?.id ?? (this.intent.kind === 'pass' ? this.intent.target : this.carrier));
      this.moveGoalie(stepDt, this.intent.kind === 'shot' ? previous : undefined);
      if ((this.puck.height ?? 0) < 2.1 && this.defenders.some(d => distance(d, this.puck) < 1.05)) { this.fail('PICKED OFF. Bend around the red jerseys.'); break; }
      if (Math.abs(this.puck.x) > BOARD_X + 0.001 || Math.abs(this.puck.z) > BOARD_Z + 0.001) { this.fail('OFF THE ICE. Aim the bank inside the boards.'); break; }
      if (this.intent.kind !== 'shot' && this.puck.z < NET_Z - 0.1 && this.puck.z > -20.2 && Math.abs(this.puck.x) < NET_HALF_WIDTH + 0.15) { this.fail('HIT THE CAGE. Bank around the outside of the net.'); break; }
      if (previous.z > this.goalie.z && this.puck.z <= this.goalie.z) {
        const crossing = mix(previous, this.puck, (this.goalie.z - previous.z) / (this.puck.z - previous.z));
        if (this.goalieCovers(crossing)) { this.puck = crossing; this.save(); break; }
      }
      if (previous.z > NET_Z && this.puck.z <= NET_Z && (this.intent.kind === 'shot' || Math.abs(this.puck.x) < NET_HALF_WIDTH - 0.15)) {
        const crossing = mix(previous, this.puck, (NET_Z - previous.z) / (this.puck.z - previous.z));
        if ((crossing.height ?? 0) > NET_HEIGHT - 0.15) this.fail('OVER THE BAR. Aim below the red crossbar.');
        else if (Math.abs(crossing.x) >= NET_HALF_WIDTH - 0.15) this.fail('WIDE OF THE NET. Aim inside the red posts.');
        else {
          this.goalHeight = crossing.height ?? 0;
          if (this.actionCurved) this.curvedActions++;
          if (this.actionPower === 'freeze') this.frozenActions++;
          this.phase = 'SUCCESS';
          this.callout = this.goalHeight >= 3.8 ? 'BAR DOWN!' : this.goalHeight >= 3 ? 'TOP SHELF!' : this.actionCurved ? 'FILTHY!' : 'LIGHT THE LAMP!';
          this.message = this.callout; this.emit('goal', this.actionPower === 'fire' ? 1.6 : 1);
        }
        break;
      }
      // Defense gets first contact in a contested lane. Reception depends on
      // actual proximity, never on which teammate the gesture was labeled for.
      if (this.intent.kind !== 'shot' && (this.puck.height ?? 0) <= 0.65) {
        const receiver = this.targets.sort((p, q) => distance(p, this.puck) - distance(q, this.puck))[0];
        if (receiver && distance(receiver, this.puck) <= this.reception.pickupRadius) { this.receive(receiver.id); break; }
      }
      if (this.freeVelocity) {
        if (hit) this.bounce(hit.flipX, hit.flipZ);
        if (this.looseTime >= this.reception.looseTimeout) { this.fail('LOOSE PUCK. Play it within skating reach of a teammate.'); break; }
      } else if (this.segmentOffset >= length - 0.00001) {
        if (b.bounce) {
          this.freeVelocity = { x: this.lastHeading.x * this.speed, z: this.lastHeading.z * this.speed };
          this.bounce(Math.abs(Math.abs(b.x) - BOARD_X) < 0.001, Math.abs(Math.abs(b.z) - BOARD_Z) < 0.001);
          continue;
        }
        this.segment++; this.segmentOffset = 0;
        if (this.segment === this.path.length - 1) this.finishPath();
      }
    }
    if (!this.paused) this.addTrail();
  }

  private addTrail() {
    if (!this.trail.length || distance(this.trail[this.trail.length - 1], this.puck) > 0.15) this.trail.push(copy(this.puck));
    if (this.trail.length > 28) this.trail.shift();
  }

  private separateSkaters(pinned: number) {
    const spaced = spaceSkaters([...this.attackers, ...this.defenders], pinned);
    this.attackers = spaced.slice(0, 3);
    if (!(this.phase === 'EXECUTING_ACTION' && this.actionPower === 'freeze')) this.defenders = spaced.slice(3);
  }

  private planReception(path: Point[], speed: number) {
    this.pickupPlans = this.attackers.map((player, id) => {
      if (id === this.carrier || this.intent.kind === 'shot') return null;
      let best: Point | null = null, bestDistance = Infinity, traveled = 0;
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], length = distance(a, b);
        const samples = Math.max(1, Math.ceil(length / 0.5));
        // Include the exact nearest point as well as later reachable points.
        const nearest = length > 0 ? clamp(((player.x - a.x) * (b.x - a.x) + (player.z - a.z) * (b.z - a.z)) / (length * length), 0, 1) : 1;
        for (const t of [nearest, ...Array.from({ length: samples + 1 }, (_, j) => j / samples)]) {
          const p = mix(a, b, t), d = distance(player, p);
          const arrival = (traveled + length * t) / Math.max(speed, 0.5);
          if (d > this.reception.pursuitRadius || d >= bestDistance || (p.height ?? 0) > 0.65) continue;
          if (p.z < NET_Z && p.z > -20.5 && Math.abs(p.x) < NET_HALF_WIDTH + 0.5) continue;
          if (d > this.reception.skateSpeed * arrival + this.reception.pickupRadius) continue;
          best = { x: clamp(p.x, -9.6, 9.6), z: clamp(p.z, -21.3, 21.3) }; bestDistance = d;
        }
        traveled += length;
      }
      return best;
    });
  }

  private planFreeReception() {
    if (!this.freeVelocity) return;
    const speed = distance(this.freeVelocity, { x: 0, z: 0 });
    const duration = Math.min(1.2, Math.max(0, this.reception.looseTimeout - this.looseTime));
    const stopTime = Math.min(duration, speed / this.reception.coastDrag);
    const runout = speed * stopTime - 0.5 * this.reception.coastDrag * stopTime * stopTime;
    const end = { x: this.puck.x + this.freeVelocity.x / Math.max(speed, 0.001) * runout, z: this.puck.z + this.freeVelocity.z / Math.max(speed, 0.001) * runout };
    const path = bankPath([this.puck, end]);
    this.planReception(path, Math.max(0.5, speed * 0.65));
    // Once the puck settles, a nearby skater gets a short collection window.
    if (speed < 2) this.pickupPlans = this.attackers.map((p, i) => i !== this.carrier && distance(p, this.puck) <= Math.min(this.reception.pursuitRadius, this.reception.skateSpeed * duration + this.reception.pickupRadius) ? copy(this.puck) : null);
    this.pickupReplan = 0.12;
  }

  private moveReceivers(dt: number) {
    if (this.freeVelocity) {
      this.pickupReplan -= dt;
      if (this.pickupReplan <= 0) this.planFreeReception();
    }
    this.attackers = this.attackers.map((p, i) => {
      const pickup = this.pickupPlans[i];
      if (pickup) {
        const d = distance(p, pickup);
        const next = mix(p, pickup, Math.min(1, this.reception.skateSpeed * dt / Math.max(d, 0.001)));
        if (next.z < NET_Z + 0.5 && next.z > -20.5 && Math.abs(next.x) < NET_HALF_WIDTH + 0.5) return p;
        return next;
      }
      if (this.freeVelocity) return p;
      return mix(this.fromAttack[i], this.toAttack[i], Math.min(1, this.actionDistance / this.actionLength));
    });
  }

  private bounce(flipX: boolean, flipZ: boolean) {
    if (!this.freeVelocity) return;
    this.actionBanked = true;
    this.freeVelocity.x *= (flipX ? -1 : 1) * this.reception.boardRetention;
    this.freeVelocity.z *= (flipZ ? -1 : 1) * this.reception.boardRetention;
    this.path = []; this.segment = 0; this.segmentOffset = 0;
    this.intent = { kind: 'loose' };
    this.actionCurved = true;
    this.callout = 'OFF THE BOARDS!'; this.emit('bank', 0.45); this.addTrail();
    this.planFreeReception();
  }

  private goalieCovers(p: Point) {
    const y = p.height ?? 0, dx = Math.abs(p.x - this.goalie.x);
    const pads = y >= 0 && y < 0.9 && dx < 1.3;
    const torso = y >= 0.65 && y < 2.25 && dx < 0.95;
    const glove = Math.hypot((p.x - this.goalieGlove.x) / 0.85, (y - (this.goalieGlove.height ?? 0)) / 0.85) < 1;
    return pads || torso || glove;
  }

  private moveGoalie(dt: number, previous?: Point) {
    this.goalieRecovery = Math.max(0, this.goalieRecovery - dt);
    let aimX = this.puck.x * 0.32;
    let gloveX: number = this.coveredCorner.x, gloveHeight: number = this.coveredCorner.height;
    if (previous) {
      this.goalieShotTime += dt;
      // Read only the puck's current heading, never the drawn destination.
      // Reaction delay and momentum give late bends and quick shots an edge.
      if (this.goalieShotTime < 0.14 + this.goalieRecovery * 0.3) return;
      const dz = this.puck.z - previous.z;
      const ahead = dz < -0.00001 ? clamp((this.goalie.z - this.puck.z) / dz, 0, 10000) : 0;
      aimX = this.puck.x + (this.puck.x - previous.x) * ahead;
      gloveX = aimX;
      gloveHeight = clamp((this.puck.height ?? 0) + ((this.puck.height ?? 0) - (previous.height ?? 0)) * ahead, 0.4, 3.65);
    }
    const recovering = this.goalieRecovery > 0;
    const bodyTarget = clamp(aimX, -1.9, 1.9);
    const desiredVelocity = clamp((bodyTarget - this.goalie.x) * 12, -6.5, 6.5);
    this.goalieVelocity += clamp(desiredVelocity - this.goalieVelocity, -38 * dt, 38 * dt);
    this.goalie.x = clamp(this.goalie.x + this.goalieVelocity * dt * (recovering ? 0.55 : 1), -1.9, 1.9);
    const target = { x: clamp(gloveX, this.goalie.x - 1.8, this.goalie.x + 1.8), height: gloveHeight };
    for (const axis of ['x', 'height'] as const) {
      const value = this.goalieGlove[axis] ?? 0;
      const desired = clamp((target[axis] - value) * 14, -8, 8);
      this.goalieGloveVelocity[axis] += clamp(desired - this.goalieGloveVelocity[axis], -55 * dt, 55 * dt);
      this.goalieGlove[axis] = value + this.goalieGloveVelocity[axis] * dt * (recovering ? 0.55 : 1);
    }
    this.goalieGlove.x = clamp(this.goalieGlove.x, -2.65, 2.65);
    this.goalieGlove.height = clamp(this.goalieGlove.height ?? 0, 0.35, 3.65);
  }

  private finishPath() {
    if (this.intent.kind === 'shot') { this.fail('LOOSE PUCK. Finish the shot inside the net.'); return; }
    // A pass does not belong to anyone until a teammate actually reaches it.
    this.freeVelocity = { x: this.lastHeading.x * this.speed * 0.72, z: this.lastHeading.z * this.speed * 0.72 };
    this.path = []; this.segment = 0; this.segmentOffset = 0;
    this.planFreeReception();
  }

  private receive(receiver: number) {
    this.passes++;
    if (this.actionBanked) this.bankPasses++;
    if (distance(this.fromAttack[receiver], this.attackers[receiver]) >= 1.25) this.leadPasses++;
    if (this.actionCurved) this.curvedActions++;
    if (this.actionPower === 'freeze') this.frozenActions++;
    this.callout = this.actionCurved ? 'FILTHY!' : 'THREAD THE NEEDLE!';
    this.actionPower = null;
    this.carrier = receiver;
    // Keep the puck at the actual contact point within stick reach.
    this.freeVelocity = null;
    this.pickupPlans = [null, null, null];
    // A late pass stays in the shooting setup instead of adding another stage.
    this.path = [];
    this.intent = { kind: 'loose' };
    const latePass = this.stage >= this.level.moments.length - 1;
    if (!latePass) this.stage++;
    this.phase = 'PAUSED_FOR_INPUT';
    this.trail = [];
    this.message = latePass ? 'Find the open corner and shoot.' : this.moment.instruction;
    this.emit('pass', 0);
  }

  private save() {
    this.emit('save');
    this.freeVelocity = null;
    this.pickupPlans = [null, null, null];
    this.callout = 'SECOND CHANCE!';
    this.actionPower = null;
    this.goalieRecovery = 0.65;
    if (this.reboundUsed) { this.fail('DENIED. Try the other corner.'); return; }
    this.reboundUsed = true;
    this.stage = this.level.moments.length - 1;
    this.path = [];
    this.phase = 'REBOUND';
    this.cancel();
    this.routeTime = 0;
    this.reboundStart = copy(this.puck);
    this.carrier = this.targets.sort((a, b) => b.x - a.x)[0].id;
    this.reboundEnd = { x: 6, z: -11.5 };
    this.fromAttack = this.attackers.map(copy);
    this.message = 'PAD SAVE → SECOND CHANCE';
  }
}
