// Rink coordinates: x across the ice, z toward the camera. Attack toward -z.
import { LEVELS, MOMENTS, CHAPTERS, CHAPTER_LEVEL_COUNTS, HIGHLIGHTS, OBJECTIVES, OBJECTIVE_LABELS } from './content/levels';
import type { Point, Powerup } from './content/types';
export type { Point, Powerup, Objective, Moment, Level } from './content/levels';
export { LEVELS, MOMENTS, CHAPTERS, CHAPTER_LEVEL_COUNTS, HIGHLIGHTS, OBJECTIVES, OBJECTIVE_LABELS };
export const BOARD_X = 10.75;
export const BOARD_Z = 22.5;
export type Phase = 'AUTO_PLAY' | 'PAUSED_FOR_INPUT' | 'EXECUTING_ACTION' | 'REBOUND' | 'SUCCESS' | 'FAIL';
export type Intent = { kind: 'pass'; target: number } | { kind: 'shot' } | { kind: 'loose' };
export type ShotStyle = 'wrist' | 'snapshot' | 'oneTimer' | 'curve' | 'screen' | 'rebound';
export type GameEvent = { id: number; event: string };
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
export function isScreenedShot(start: Point, end: Point, defenders: readonly Point[]): boolean {
  const dx = end.x - start.x, dz = end.z - start.z, length2 = dx * dx + dz * dz;
  if (length2 < 0.001) return false;
  return defenders.some(defender => {
    const t = ((defender.x - start.x) * dx + (defender.z - start.z) * dz) / length2;
    if (t < 0.2 || t > 0.9) return false;
    return distance(defender, { x: start.x + dx * t, z: start.z + dz * t }) <= 1.45;
  });
}
export const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, ...(a.height !== undefined || b.height !== undefined ? { height: (a.height ?? 0) + ((b.height ?? 0) - (a.height ?? 0)) * t } : {}) });
const copy = (p: Point): Point => ({ ...p });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const SKATER_SPACING = 1.85;
export const DEFAULT_RECEPTION = {
  // A receiver should be able to skate onto a sensible lead, but a pass still
  // has to enter their lane. These values are deliberately generous only once
  // the player has drawn the puck into reachable ice.
  pickupRadius: 0.98, pursuitRadius: 7, skateSpeed: 7.8,
  assistRadius: 1.4, assistStrength: 0.18, maxAssist: 0.2,
  coastDrag: 13, boardRetention: 0.88,
};
export type ReceptionConfig = typeof DEFAULT_RECEPTION;
// Keep the receiver fixed and give everyone else a distinct patch of ice.
// The same small constraint is applied along routes, not only at their ends.
export function spaceSkaters(points: Point[], pinned: number, fullRink = false): Point[] {
  const result = points.map(copy);
  const edgeX = fullRink ? BOARD_X : 9.6, minZ = fullRink ? -BOARD_Z : -15.5, maxZ = fullRink ? BOARD_Z : 21;
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
      if (Math.abs(dz) < 0.25 && (Math.abs(a.x - dx * push * shareA) > edgeX || Math.abs(b.x + dx * push * shareB) > edgeX)) {
        dx = 0; dz = b.z >= a.z ? 1 : -1;
      }
      a.x = clamp(a.x - dx * push * shareA, -edgeX, edgeX);
      a.z = clamp(a.z - dz * push * shareA, minZ, maxZ);
      b.x = clamp(b.x + dx * push * shareB, -edgeX, edgeX);
      b.z = clamp(b.z + dz * push * shareB, minZ, maxZ);
      adjusted = true;
    }
    if (!adjusted) break;
  }
  return result;
}

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
    const lengths = smooth.map((p, i) => i ? distance(smooth[i - 1], p) : 0);
    const total = lengths.reduce((sum, length) => sum + length, 0);
    let traveled = 0;
    for (let i = 1; i < smooth.length; i++) {
      traveled += lengths[i];
      const progress = traveled / Math.max(total, 0.001);
      const weight = Math.pow(Math.max(0, (progress - 0.75) * 4), 2);
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
  startPreview() {
    if (this.phase !== 'AUTO_PLAY' || this.stage !== 0) return;
    this.introRemaining = 3;
    this.emit('countdown', 0);
  }
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
  events: GameEvent[] = [];
  callout = '';
  terminalTime = 0;
  armed: Powerup | null = null;
  actionPower: Powerup | null = null;
  private usedPowerups = new Set<string>();
  passes = 0;
  bankPasses = 0;
  leadPasses = 0;
  // Successful attacking recoveries after a puck becomes genuinely loose.
  // Progression observes this run fact; the renderer remains unaware of it.
  loosePuckWins = 0;
  private actionBanked = false;
  private bankApproach = false;
  curvedActions = 0;
  frozenActions = 0;
  goalHeight = 0;
  shotStyle: ShotStyle = 'wrist';
  private actionCurved = false;
  get availablePowerup() { return this.paused && !this.reboundUsed && !this.usedPowerups.has(String(this.stage)) ? this.moment.powerup : undefined; }
  activatePowerup() {
    if (!this.availablePowerup || this.armed) return;
    this.armed = this.availablePowerup;
    this.cancel();
    this.emit('powerup', 0.45);
  }
  get objectives() {
    return this.level.objectives.map(id => ({ id, label: OBJECTIVE_LABELS[id], complete: this.phase === 'SUCCESS' && (
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
  private pickupPlans: (Point | null)[] = [null, null, null];
  private pickupReplan = 0;
  // Keep a skater committed to a lane for an action. Re-evaluating the nearest
  // player every physics slice made two nearby teammates twitch and swap jobs.
  private pursuingAttacker = -1;
  private pressureDefender = -1;
  private lastHeading: Point = { x: 0, z: -1 };
  private toDefense: Point[] = [];
  private toAttack: Point[] = [];
  private reboundStart: Point = { x: 0, z: 0 };
  private reboundEnd: Point = { x: 6, z: -11 };

  get targets() { return this.attackers.map((p, i) => ({ ...p, id: i })).filter(p => p.id !== this.carrier); }
  private get collectors() {
    return this.loosePuck ? this.attackers.map((p, id) => ({ ...p, id })) : this.targets;
  }
  get paused() { return this.phase === 'PAUSED_FOR_INPUT'; }
  get terminal() { return this.phase === 'SUCCESS' || this.phase === 'FAIL'; }
  get loosePuck() { return this.phase === 'EXECUTING_ACTION' && this.freeVelocity !== null; }

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
      const lengths = this.preview.map((p, i) => i ? distance(this.preview[i - 1], p) : 0);
      const total = lengths.reduce((sum, length) => sum + length, 0);
      let traveled = 0;
      this.preview = this.preview.map((p, i, a) => {
        traveled += lengths[i];
        // Curve power follows distance along the stroke, not how often a phone
        // happened to report touch samples. This makes a deliberate hook
        // repeatable across devices and frame rates.
        const baseline = mix(start, finish, traveled / Math.max(total, 0.001));
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
    if (this.intent.kind === 'shot') {
      this.shotStyle = this.reboundUsed ? 'rebound'
        : this.actionCurved ? 'curve'
        : isScreenedShot(start, end, this.defenders) ? 'screen'
        : this.stage > 0 ? 'oneTimer'
        : seconds <= 0.45 ? 'snapshot'
        : 'wrist';
    }
    const bankAction = this.preview.some(p => p.bounce);
    this.bankApproach = bankAction;
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
    this.speed = 24 + clamp(length / Math.max(seconds, 0.1) / 20, 0, 5);
    if (this.intent.kind === 'shot') this.speed *= this.shotStyle === 'oneTimer' ? 1.14
      : this.shotStyle === 'rebound' ? 1.10 : this.shotStyle === 'snapshot' ? 1.08 : 1;
    if (this.actionPower === 'fire') this.speed *= 2.8;
    this.actionDistance = 0;
    this.actionTime = 0;
    this.freeVelocity = null;
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
    this.pursuingAttacker = this.collectors.filter(p => this.pickupPlans[p.id])
      .sort((a, b) => distance(a, this.puck) - distance(b, this.puck))[0]?.id ?? -1;
    // The approach to a bank is committed at release. Letting a teammate pick
    // it up before contact makes a drawn board pass feel inconsistent.
    if (bankAction) {
      this.pickupPlans = [null, null, null];
      this.pursuingAttacker = -1;
    }
    this.pressureDefender = this.defenders.reduce((best, p, i, all) => distance(p, this.puck) < distance(all[best], this.puck) ? i : best, 0);
    this.phase = 'EXECUTING_ACTION';
    this.message = this.intent.kind === 'pass' ? 'THREAD IT.' : this.intent.kind === 'shot' ? 'LET IT RIP.' : 'INTO SPACE.';
    const shotCallout: Record<ShotStyle, string> = { wrist: 'WRISTER!', snapshot: 'QUICK RELEASE!', oneTimer: 'ONE-TIMER!', curve: 'BEND IT!', screen: 'THROUGH TRAFFIC!', rebound: 'BURY IT!' };
    this.callout = this.actionPower === 'fire' ? 'FIRE PUCK!' : this.actionPower === 'curve' ? 'MEGA CURVE!' : this.actionPower === 'freeze' ? 'ICE COLD!' : this.intent.kind === 'shot' ? shotCallout[this.shotStyle] : '';
    const shotEvent: Record<ShotStyle, string> = { wrist: 'release', snapshot: 'snapshot', oneTimer: 'oneTimer', curve: 'curveShot', screen: 'screenShot', rebound: 'reboundShot' };
    this.emit(this.intent.kind === 'shot' ? shotEvent[this.shotStyle] : 'release', this.actionPower === 'fire' ? 1.6 : this.intent.kind === 'shot' ? 0.65 : 0.35);
  }

  private emit(event: string, impact = 1) {
    this.event = event; this.eventId++; this.impact = impact;
    this.events.push({ id: this.eventId, event });
    // Event delivery only needs enough history for one rendered frame, but the
    // cap keeps a long running game from retaining an unbounded event log.
    if (this.events.length > 24) this.events.splice(0, this.events.length - 24);
  }
  private fail(message: string) { this.phase = 'FAIL'; this.message = message; this.emit('fail'); }

  update(realDt: number) {
    // Freeze includes the camera, players, particles, goalie, and simulation clock.
    if (this.paused) return;
    const dt = Number.isFinite(realDt) ? clamp(realDt, 0, 0.05) : 0;
    if (this.introRemaining > 0) {
      this.introRemaining = Math.max(0, this.introRemaining - dt);
      if (this.introRemaining === 0) this.emit('start', 0.35);
      return;
    }
    // The dramatic goal-mouth time warp belongs to shots.  Passes that travel
    // deep into the attacking zone should keep their committed pace so the
    // receiver can skate onto the moving puck in stride.
    const slow = (this.phase === 'EXECUTING_ACTION' && this.intent.kind === 'shot' && this.puck.z < -14) || this.phase === 'REBOUND' ? 0.42 : 1;
    this.elapsed += dt;
    this.motion += dt * (this.phase === 'SUCCESS' ? 0.35 : slow);
    this.impact = Math.max(0, this.impact - dt * 1.8);
    if (this.terminal) { this.terminalTime += dt; return; }
    if (this.phase === 'AUTO_PLAY') {
      this.routeTime += dt;
      const t = Math.min(1, this.routeTime / 0.92);
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
      const t = Math.min(1, this.routeTime / 0.58);
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
    // Cap movement increments so close interceptions and skate races stay
    // stable across common phone frame rates.
    const physicsStep = 1 / 120;
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
        stepDt = Math.min(remaining, physicsStep, 0.12 / Math.max(speed, 0.1));
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
      } else {
        step = Math.min(this.speed * remaining, this.speed * physicsStep, 0.12, length - this.segmentOffset);
        stepDt = step / this.speed;
        this.segmentOffset += step;
        this.puck = mix(a, b, this.segmentOffset / length);
        this.lastHeading = { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
      }
      remaining -= stepDt;
      this.actionDistance += step;
      this.actionTime += stepDt;
      this.moveDefense(stepDt);
      this.moveReceivers(stepDt);
      const pursuing = this.collectors.find(p => p.id === this.pursuingAttacker && this.pickupPlans[p.id])
        ?? this.collectors.filter(p => this.pickupPlans[p.id]).sort((p, q) => distance(p, this.puck) - distance(q, this.puck))[0];
      this.separateSkaters(pursuing?.id ?? (this.intent.kind === 'pass' ? this.intent.target : this.carrier));
      this.moveGoalie(stepDt, this.intent.kind === 'shot' ? previous : undefined);
      // A defender needs a clear stick-length touch. The smaller radius keeps
      // an otherwise clean lead from feeling like it was stolen by a hitbox.
      if ((this.puck.height ?? 0) < 2.1 && this.defenders.some(d => distance(d, this.puck) < 0.6)) { this.fail('PICKED OFF. Bend around the red jerseys.'); break; }
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
        const receiver = this.collectors.sort((p, q) => distance(p, this.puck) - distance(q, this.puck))[0];
        // Give even a stick-on pass enough time to cross several rendered
        // frames before possession freezes at the catch point.
        if (receiver && this.actionTime >= 0.1 && distance(receiver, this.puck) <= this.reception.pickupRadius) { this.receive(receiver.id); break; }
      }
      if (this.freeVelocity) {
        if (hit) this.bounce(hit.flipX, hit.flipZ);
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
    const spaced = spaceSkaters([...this.attackers, ...this.defenders], pinned, this.loosePuck);
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
    const duration = 1.2;
    const stopTime = Math.min(duration, speed / this.reception.coastDrag);
    const runout = speed * stopTime - 0.5 * this.reception.coastDrag * stopTime * stopTime;
    const end = { x: this.puck.x + this.freeVelocity.x / Math.max(speed, 0.001) * runout, z: this.puck.z + this.freeVelocity.z / Math.max(speed, 0.001) * runout };
    const path = bankPath([this.puck, end]);
    this.planReception(path, Math.max(0.5, speed * 0.65));
    const reachable = this.collectors.filter(p => this.pickupPlans[p.id]);
    if (reachable.length) {
      // Preserve viable intercept points across replans; only transfer the
      // chase when the assigned skater no longer has a reachable route.
      if (!reachable.some(p => p.id === this.pursuingAttacker)) {
        this.pursuingAttacker = reachable.sort((a, b) => distance(a, this.puck) - distance(b, this.puck))[0].id;
      }
    } else {
      // A stopped puck remains playable even outside the initial pass range.
      const closest = this.collectors.sort((a, b) => distance(a, this.puck) - distance(b, this.puck))[0];
      this.pickupPlans = this.attackers.map((_, i) => i === closest?.id ? copy(path[path.length - 1]) : null);
      this.pursuingAttacker = closest?.id ?? -1;
    }
    this.pickupReplan = 0.12;
  }

  private skateToward(p: Point, target: Point, speed: number, dt: number) {
    let destination = { x: clamp(target.x, -BOARD_X, BOARD_X), z: clamp(target.z, -BOARD_Z, BOARD_Z) };
    // Route around the cage instead of getting stuck against its front/back.
    const side = (p.x || destination.x) < 0 ? -1 : 1;
    const crossesNet = Math.min(p.z, destination.z) < -17.4 && Math.max(p.z, destination.z) > -21;
    if (crossesNet && Math.min(Math.abs(p.x), Math.abs(destination.x)) < NET_HALF_WIDTH + 0.8) {
      destination = Math.abs(p.x) < NET_HALF_WIDTH + 0.8
        ? { x: side * (NET_HALF_WIDTH + 1), z: p.z }
        : { x: p.x, z: destination.z };
    }
    return mix(p, destination, Math.min(1, speed * dt / Math.max(distance(p, destination), 0.001)));
  }

  private moveDefense(dt: number) {
    if (this.actionPower === 'freeze') return;
    const closest = this.defenders.reduce((best, p, i, all) => distance(p, this.puck) < distance(all[best], this.puck) ? i : best, 0);
    // Change who pressures only when the other defender has clearly won the
    // race. This prevents visible role-flipping as the puck crosses center.
    if (this.pressureDefender < 0 || distance(this.defenders[closest], this.puck) + 0.65 < distance(this.defenders[this.pressureDefender], this.puck)) this.pressureDefender = closest;
    const velocity = this.freeVelocity ?? { x: this.lastHeading.x * this.speed, z: this.lastHeading.z * this.speed };
    const velocityLength = Math.max(distance(velocity, { x: 0, z: 0 }), 0.001);
    const lead = Math.min(2.4, velocityLength * 0.12);
    const target = { x: this.puck.x + velocity.x / velocityLength * lead, z: this.puck.z + velocity.z / velocityLength * lead };
    this.defenders = this.defenders.map((p, i) => {
      // Support shades toward the live passing lane while one player pressures.
      const formation = this.toDefense[i] ?? p;
      const cover = mix(formation, this.puck, 0.12);
      return this.skateToward(p, i === this.pressureDefender ? target : cover, 4.8, dt);
    });
  }

  private moveReceivers(dt: number) {
    // The puck is committed to the first board contact. Hold the formation on
    // its approach, then let normal loose-puck pursuit take over after impact.
    // A skater can still collect it at the ordinary stick radius below.
    if (this.bankApproach) return;
    if (this.freeVelocity) {
      this.pickupReplan -= dt;
      if (this.pickupReplan <= 0) this.planFreeReception();
    }
    const planned = this.collectors.find(p => p.id === this.pursuingAttacker && this.pickupPlans[p.id])
      ?? this.collectors.filter(p => this.pickupPlans[p.id]).sort((a, b) => distance(a, this.puck) - distance(b, this.puck))[0];
    if (planned) this.pursuingAttacker = planned.id;
    const closest = planned ?? this.collectors.sort((a, b) => distance(a, this.path[this.path.length - 1] ?? this.puck) - distance(b, this.path[this.path.length - 1] ?? this.puck))[0];
    this.attackers = this.attackers.map((p, i) => {
      const pickup = this.intent.kind !== 'shot' && i === closest?.id ? this.pickupPlans[i] ?? this.path[this.path.length - 1] ?? this.puck : null;
      if (pickup) {
        return this.skateToward(p, pickup, this.reception.skateSpeed, dt);
      }
      const formation = this.toAttack[i] ?? p;
      if (this.freeVelocity) return this.skateToward(p, mix(formation, this.puck, 0.15), this.reception.skateSpeed, dt);
      const routePosition = mix(this.fromAttack[i], formation, Math.min(1, this.actionDistance / this.actionLength));
      // Short actions need a speed cap; longer authored routes retain their
      // existing timing while the renderer limits their visible skate speed.
      return this.actionLength < 4 ? this.skateToward(p, routePosition, this.reception.skateSpeed, dt) : routePosition;
    });
  }

  private bounce(flipX: boolean, flipZ: boolean) {
    if (!this.freeVelocity) return;
    this.actionBanked = true;
    this.bankApproach = false;
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
    if (this.freeVelocity !== null || this.actionBanked) this.loosePuckWins++;
    if (receiver === this.carrier) {
      this.freeVelocity = null; this.pickupPlans = [null, null, null]; this.path = []; this.trail = [];
      this.pursuingAttacker = -1; this.pressureDefender = -1;
      this.actionPower = null; this.intent = { kind: 'loose' }; this.phase = 'PAUSED_FOR_INPUT';
      this.callout = 'RECOVERED!'; this.message = 'Back on your stick. Find a teammate or take the shot.';
      this.emit('pass', 0); return;
    }
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
    this.pursuingAttacker = -1; this.pressureDefender = -1;
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
    this.pursuingAttacker = -1; this.pressureDefender = -1;
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
