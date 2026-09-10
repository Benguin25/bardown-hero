// Rink coordinates: x across the ice, z toward the camera. Attack toward -z.
export type Point = { x: number; z: number; height?: number };
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

type Moment = { title: string; instruction: string; carrier: Point; support: readonly Point[]; defense: readonly Point[] };
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
    { title: 'SET UP THE SAVE', instruction: 'Pass to the middle to set up a rebound test.', carrier: { x: -6, z: -5 }, support: [{ x: 0, z: -10 }, { x: 7, z: -9 }], defense: [{ x: -5, z: -12 }, { x: 5, z: -6 }] },
    { title: 'TEST THE PADS', instruction: 'Shoot at the goalie for a guided rebound, then pick a corner.', carrier: { x: 0, z: -10 }, support: [{ x: 6, z: -11.5 }, { x: -7, z: -10 }], defense: [{ x: -5, z: -13 }, { x: 5, z: -6 }] },
  ] },
];

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

export class Game {
  readonly levelIndex: number;
  constructor(levelIndex = 0) {
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
  message = 'Here comes the rush…';
  private routeTime = 0;
  private fromAttack = this.attackers.map(copy);
  private fromDefense = this.defenders.map(copy);
  private segment = 0;
  private segmentOffset = 0;
  private speed = 22;
  private actionDistance = 0;
  private actionLength = 1;
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
    this.intent = this.classify(raw[raw.length - 1]);
    const end = this.intent.kind === 'pass' ? this.attackers[this.intent.target] : undefined;
    let stroke = raw;
    const target = raw[raw.length - 1];
    if (this.intent.kind === 'shot' && target.height !== undefined) {
      // Dragging around the goal face adjusts the destination, rather than
      // executing an earlier crossing of the goal line at the wrong height.
      const enteredNet = raw.findIndex((p, i) => i > 0 && p.height !== undefined);
      if (enteredNet > 0) stroke = [...raw.slice(0, enteredNet), target];
    }
    this.preview = cleanPath([copy(this.puck), ...stroke.slice(1).map(p => ({ x: p.x, z: p.z }))], end);
    if (this.intent.kind === 'shot' && target.height !== undefined) {
      const total = this.preview.reduce((sum, p, i, a) => sum + (i ? distance(a[i - 1], p) : 0), 0);
      let traveled = 0;
      this.preview = this.preview.map((p, i, a) => {
        if (i) traveled += distance(a[i - 1], p);
        return i === 0 ? p : { ...p, height: target.height! * traveled / Math.max(total, 0.001) };
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
    this.actionDistance = 0;
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
    this.phase = 'EXECUTING_ACTION';
    this.message = this.intent.kind === 'pass' ? 'THREAD IT.' : this.intent.kind === 'shot' ? 'LET IT RIP.' : 'LOOSE PUCK…';
    this.emit('release', 0.35);
  }

  private emit(event: string, impact = 1) { this.event = event; this.eventId++; this.impact = impact; }
  private fail(message: string) { this.phase = 'FAIL'; this.message = message; this.emit('fail'); }

  update(realDt: number) {
    // Freeze includes the camera, players, particles, goalie, and simulation clock.
    if (this.paused) return;
    const dt = Number.isFinite(realDt) ? clamp(realDt, 0, 0.05) : 0;
    const slow = (this.phase === 'EXECUTING_ACTION' && this.puck.z < -14) || this.phase === 'REBOUND' ? 0.42 : 1;
    this.elapsed += dt;
    this.motion += dt * slow;
    this.impact = Math.max(0, this.impact - dt * 1.8);
    if (this.terminal) return;
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
    let travel = this.speed * dt * slow;
    // Swept substeps prevent fast shots tunneling through defenders or the goalie.
    while (travel > 0 && this.phase === 'EXECUTING_ACTION') {
      const a = this.path[this.segment];
      const b = this.path[this.segment + 1];
      if (!b) { this.finishPath(); break; }
      const length = distance(a, b);
      if (length < 0.0001) { this.segment++; this.segmentOffset = 0; continue; }
      const step = Math.min(travel, 0.12, length - this.segmentOffset);
      const previous = this.puck;
      this.segmentOffset += step;
      travel -= step;
      this.actionDistance += step;
      const flightTime = this.actionDistance / this.speed;
      this.defenders = this.fromDefense.map((p, i) => mix(p, this.toDefense[i], Math.min(1, flightTime * 4 / Math.max(0.001, distance(p, this.toDefense[i])))));
      this.attackers = this.fromAttack.map((p, i) => mix(p, this.toAttack[i], Math.min(1, this.actionDistance / this.actionLength)));
      this.separateSkaters(this.intent.kind === 'pass' ? this.intent.target : this.carrier);
      this.puck = mix(a, b, this.segmentOffset / length);
      this.moveGoalie(step / this.speed, this.intent.kind === 'shot' ? previous : undefined);
      if ((this.puck.height ?? 0) < 2.1 && this.defenders.some(d => distance(d, this.puck) < 1.05)) { this.fail('PICKED OFF. Bend around the red jerseys.'); break; }
      if (Math.abs(this.puck.x) > 10.5 || this.puck.z > 22 || this.puck.z < -21) { this.fail('OFF THE ICE. Keep the curve inside the boards.'); break; }
      if (previous.z > this.goalie.z && this.puck.z <= this.goalie.z) {
        const crossing = mix(previous, this.puck, (this.goalie.z - previous.z) / (this.puck.z - previous.z));
        if (this.goalieCovers(crossing)) { this.puck = crossing; this.save(); break; }
      }
      if (previous.z > NET_Z && this.puck.z <= NET_Z) {
        const crossing = mix(previous, this.puck, (NET_Z - previous.z) / (this.puck.z - previous.z));
        if ((crossing.height ?? 0) > NET_HEIGHT - 0.15) this.fail('OVER THE BAR. Aim below the red crossbar.');
        else if (Math.abs(crossing.x) >= NET_HALF_WIDTH - 0.15) this.fail('WIDE OF THE NET. Aim inside the red posts.');
        else { this.phase = 'SUCCESS'; this.message = 'BAR DOWN!'; this.emit('goal'); }
        break;
      }
      if (this.segmentOffset >= length - 0.00001) {
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
    this.defenders = spaced.slice(3);
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
    if (this.intent.kind === 'pass') {
      this.carrier = this.intent.target;
      this.puck = copy(this.attackers[this.carrier]);
      // A late pass stays in the shooting setup instead of adding a fourth stage.
      this.path = [];
      this.intent = { kind: 'loose' };
      const latePass = this.stage >= this.level.moments.length - 1;
      if (!latePass) this.stage++;
      this.phase = 'PAUSED_FOR_INPUT';
      this.trail = [];
      this.message = latePass ? 'Find the open corner and shoot.' : this.moment.instruction;
      this.emit('pass', 0);
    } else this.fail('LOOSE PUCK. Finish on a teammate or inside the net.');
  }

  private save() {
    this.emit('save');
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
