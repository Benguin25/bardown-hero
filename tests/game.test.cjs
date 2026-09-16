const { test } = require('node:test');
const assert = require('node:assert/strict');
const { bankPath, BOARD_X, BOARD_Z } = require('../.test-build/game.js');
const { emptyProgress, parseProgress, recordRun, isUnlocked, stars } = require('../.test-build/progress.js');
const { Game, LEVELS, relativeAim, cleanPath, distance, GOAL_CORNERS, NET_HEIGHT, spaceSkaters, SKATER_SPACING } = require('../.test-build/game.js');
const { tutorialGame, lessonComplete } = require('../.test-build/tutorial.js');

test('all guided lessons require their demonstrated action and can be completed at phone frame rates', () => {
  const routes = [[{ x: 5, z: 1 }], [{ x: -3, z: 0 }, { x: 5, z: 1 }], [{ x: 1, z: 3 }], [{ x: 2.25, z: -18, height: 3.5 }]];
  for (const dt of [1 / 120, 1 / 60, 0.05]) routes.forEach((route, lesson) => {
    const g = tutorialGame(lesson);
    assert.equal(lessonComplete(g, lesson, false), false);
    g.release([g.puck, ...route], 0.3);
    let chased = false;
    for (let i = 0; i < 4000 && !g.paused && !g.terminal; i++) { g.update(dt); chased ||= g.loosePuck; }
    assert.ok(lessonComplete(g, lesson, chased), `${lesson}: ${g.message}`);
    if (lesson === 2) assert.equal(lessonComplete(g, lesson, false), false);
    assert.equal(tutorialGame(lesson).passes, 0);
  });
});

test('a stopped puck remains live beyond the old timeout and is collected without teleporting', () => {
  for (const dt of [1 / 60, 0.05]) {
    const g = passingSetup({ skateSpeed: 1, pursuitRadius: 1 });
    g.attackers = [{ x: 0, z: 10 }, { x: 8, z: -10 }, { x: -8, z: -10 }];
    g.release([g.puck, { x: 0, z: 0 }], 0.3); g.actionPower = 'freeze';
    const defense = JSON.stringify(g.defenders);
    for (let t = 0; t < 4; t += dt) g.update(dt);
    assert.equal(g.phase, 'EXECUTING_ACTION'); assert.ok(g.loosePuck);
    assert.equal(JSON.stringify(g.defenders), defense);
    until(g, x => x.paused || x.terminal);
    assert.ok(g.paused, g.message);
    assert.ok(distance(g.puck, g.attackers[g.carrier]) <= g.reception.pickupRadius);
  }
});

test('defenders win an open-ice race when the attacking skaters cannot reach it first', () => {
  const g = passingSetup({ skateSpeed: 0 });
  g.attackers[1] = { x: -8, z: -10 };
  g.defenders = [{ x: 5, z: -3 }, { x: -8, z: -15 }];
  g.release([g.puck, { x: 0, z: 0 }], 0.3);
  until(g, x => x.terminal || x.paused);
  assert.equal(g.phase, 'FAIL'); assert.match(g.message, /PICKED OFF/);
});

test('a puck stopped against the side boards stays within collection reach during a contested chase', () => {
  const g = new Game(4); pause(g);
  g.release([g.puck, { x: 2.0014023035764694, z: -1.3879204634577036 }], 0.3);
  until(g, x => x.paused || x.terminal);
  assert.ok(g.paused || /PICKED OFF/.test(g.message));
});

function until(game, predicate, limit = 4000) {
  for (let i = 0; i < limit && !predicate(game); i++) game.update(1 / 60);
  assert.ok(predicate(game), `Timed out in ${game.phase}: ${game.message}`);
}
function pause(game) { until(game, g => g.paused || g.terminal); assert.equal(game.phase, 'PAUSED_FOR_INPUT'); }

const highlightRoutes = [
  [[{ x: 5, z: -7 }], [{ x: 2.25, z: -18, height: 3.5 }]],
  [[{ x: 15.5, z: -5 }], [{ x: -6, z: -10 }], [{ x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: -7, z: 5 }, { x: -9, z: 0 }, { x: -7, z: -3 }], [{ x: 7, z: -10 }], [{ x: 2.25, z: -18, height: 3.5 }]],
  [[{ x: 0, z: -10 }], [{ x: 0, z: -18 }], [{ x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: 6, z: -5 }], [{ x: -6, z: -9 }], [{ x: -8, z: -16 }, { x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: 15.5, z: -5 }], [{ x: -6, z: -9 }], [{ x: 6, z: -9 }], [{ x: -2.25, z: -18, height: 3.5 }]],
];
highlightRoutes.forEach((route, i) => test(`highlight level ${i + 11} has a three-star route using its named play`, () => {
  for (const dt of [1 / 60, 0.05]) {
    const g = new Game(i + 10);
    const advance = () => { for (let n = 0; n < 4000 && !g.paused && !g.terminal; n++) g.update(dt); };
    advance();
    for (const points of route) {
      assert.ok(g.paused, g.message);
      if (g.availablePowerup) g.activatePowerup();
      g.release([g.puck, ...points], 0.3); advance();
    }
    assert.equal(g.phase, 'SUCCESS', g.message);
    assert.ok(g.objectives.every(o => o.complete), JSON.stringify(g.objectives));
    assert.ok(route.length >= 2 && route.length <= 4);
    if (i === 0 || i === 5) assert.ok(g.leadPasses > 0);
    if (i === 1 || i === 5) assert.ok(g.bankPasses > 0);
    if (i === 3) assert.ok(g.reboundUsed);
    const retry = new Game(i + 10); assert.equal(retry.bankPasses, 0); assert.equal(retry.leadPasses, 0);
  }
}));

test('the expanded campaign preserves old saves and unlocks level eleven after ten', () => {
  const { HIGHLIGHTS, OBJECTIVES, CHAPTERS, CHAPTER_LEVEL_COUNTS } = require('../.test-build/game.js');
  assert.equal(LEVELS.length, 32); assert.equal(HIGHLIGHTS.length, LEVELS.length);
  assert.equal(CHAPTERS.length, 6); assert.equal(CHAPTER_LEVEL_COUNTS.reduce((sum, count) => sum + count, 0), LEVELS.length); assert.equal(OBJECTIVES.length, LEVELS.length);
  const saved = emptyProgress();
  for (let i = 0; i < 10; i++) saved.runs[i] = [true, false, false];
  const loaded = parseProgress(JSON.stringify(saved));
  assert.deepEqual(loaded, saved); assert.ok(isUnlocked(loaded, 10)); assert.ok(!isUnlocked(loaded, 11));
});

test('Double Take supports either first receiver and a three-star cross-ice finish', () => {
  for (const side of [-1, 1]) {
    const g = new Game(12); pause(g);
    g.release([g.puck, { x: side * 7, z: 5 }, { x: side * 9, z: 0 }, { x: side * 7, z: -3 }], 0.3); pause(g);
    assert.equal(g.carrier, side < 0 ? 1 : 2);
    const opposite = g.targets.find(p => Math.sign(p.x) !== side);
    assert.ok(opposite); g.release([g.puck, { x: opposite.x, z: opposite.z }], 0.3); pause(g);
    g.release([g.puck, GOAL_CORNERS[side < 0 ? 3 : 2]], 0.3); until(g, x => x.terminal);
    assert.equal(g.phase, 'SUCCESS'); assert.ok(g.objectives.every(o => o.complete));
  }
});

test('bank preview clips sparse swipes at the first side, end, or corner contact', () => {
  for (const end of [{ x: 18, z: 4 }, { x: -18, z: 4 }, { x: 4, z: 35 }, { x: 4, z: -35 }, { x: BOARD_X * 2, z: BOARD_Z * 2 }, { x: 60, z: 100 }]) {
    const path = bankPath([{ x: 0, z: 0 }, end]);
    assert.ok(path.some(p => p.bounce));
    assert.ok(path.every(p => Math.abs(p.x) <= BOARD_X + 1e-8 && Math.abs(p.z) <= BOARD_Z + 1e-8));
    const length = path.reduce((sum, p, i) => sum + (i ? distance(path[i - 1], p) : 0), 0);
    assert.ok(length < distance({ x: 0, z: 0 }, end));
    assert.equal(path.length, 2); assert.ok(path.at(-1).bounce);
    for (const p of path.filter(p => p.bounce)) assert.ok(Math.abs(Math.abs(p.x) - BOARD_X) < 1e-7 || Math.abs(Math.abs(p.z) - BOARD_Z) < 1e-7);
  }
  assert.deepEqual(bankPath([{ x: 0, z: 0 }, { x: Infinity, z: 0 }]), []);
  assert.deepEqual(bankPath([{ x: 0, z: 0 }, { x: 1e12, z: 0 }]).at(-1), { x: BOARD_X, z: 0, bounce: true });
});

test('side-board bank hides its rebound, then a teammate collects the reflected puck', () => {
  for (const dt of [1 / 120, 1 / 60, 0.05]) {
    const g = new Game(); pause(g);
    g.attackers = [{ x: 0, z: 0 }, { x: 3, z: 13.7 }, { x: -8, z: -10 }];
    g.puck = { ...g.attackers[0] }; g.defenders = [{ x: -8, z: -12 }, { x: -8, z: -5 }];
    const raw = [g.puck, { x: BOARD_X * 2 - 3, z: 13.7 }];
    g.aim(raw); assert.equal(g.intent.kind, 'loose'); assert.equal(g.preview.at(-1).x, BOARD_X);
    const preview = g.preview.map(p => ({ ...p })); assert.ok(preview.some(p => p.bounce));
    g.release(raw, 0.2); assert.deepEqual(g.path, preview);
    let bounced = false;
    for (let i = 0; i < 4000 && !g.paused && !g.terminal; i++) { g.update(dt); if (g.event === 'bank') bounced = true; }
    assert.ok(bounced); assert.ok(g.paused, g.message); assert.equal(g.stage, 1);
    assert.equal(g.carrier, 1); assert.ok(distance(g.puck, g.attackers[1]) <= g.reception.pickupRadius);
  }
});

test('end-board banks are collected, including self-recovery without awarding pass stars', () => {
  for (const sign of [-1, 1]) {
    const g = new Game(); pause(g);
    g.attackers = [{ x: 7, z: sign * 10 }, { x: 7, z: sign * 5 }, { x: -7, z: 0 }];
    g.puck = { ...g.attackers[0] }; g.defenders = [{ x: -8, z: 5 }, { x: -6, z: 10 }];
    const raw = [g.puck, { x: 7, z: sign * (BOARD_Z * 2 - 5) }];
    g.aim(raw); assert.equal(g.intent.kind, 'loose'); assert.ok(g.preview.some(p => Math.abs(p.z) === BOARD_Z));
    g.release(raw); pause(g);
    assert.ok(distance(g.puck, g.attackers[g.carrier]) <= g.reception.pickupRadius);
    assert.equal(g.stage, g.carrier === 0 ? 0 : 1);
    assert.equal(g.bankPasses, g.carrier === 0 ? 0 : 1);
  }
});

test('bank passes cannot pass through the back of the cage', () => {
  const g = new Game(); pause(g);
  g.attackers = [{ x: 7, z: -10 }, { x: -7, z: -10 }, { x: 7, z: 0 }];
  g.puck = { ...g.attackers[0] }; g.defenders = [{ x: -8, z: 5 }, { x: -6, z: 10 }];
  g.release([g.puck, { x: 2, z: -30 }]);
  until(g, x => x.terminal || x.paused);
  assert.equal(g.phase, 'FAIL'); assert.match(g.message, /CAGE/);
});

test('three-second introduction holds gameplay, rejects input, and resets on retry', () => {
  const g = new Game(); g.startPreview();
  const puck = { ...g.puck }, attack = g.attackers.map(p => ({ ...p }));
  g.release([g.puck, { x: 6, z: 4 }]); g.activatePowerup();
  for (let i = 0; i < 59; i++) g.update(0.05);
  assert.ok(g.introRemaining > 0); assert.equal(g.elapsed, 0); assert.deepEqual(g.puck, puck); assert.deepEqual(g.attackers, attack);
  assert.equal(g.objectives.length, 3); assert.equal(g.preview.length, 0);
  for (let i = 0; i < 3; i++) g.update(0.05);
  assert.equal(g.introRemaining, 0); pause(g);
  const retry = new Game(); retry.startPreview(); assert.equal(retry.introRemaining, 3);
});
function passOne(game) { pause(game); game.release([game.puck, { x: 6, z: 4 }]); pause(game); }
function shootingSetup() {
  const g = new Game(); passOne(g);
  g.release([g.puck, { x: 4, z: 6 }, { x: -8, z: 6 }, { x: -8, z: -7 }, { x: -6, z: -7 }]);
  pause(g); assert.equal(g.stage, 2); return g;
}

test('local progress keeps one best run, unlocks on any goal, and rejects corrupt saves', () => {
  const blank = emptyProgress();
  assert.ok(isUnlocked(blank, 0)); assert.ok(!isUnlocked(blank, 1));
  assert.deepEqual(recordRun(blank, 1, [true, true, true]), blank);
  let saved = recordRun(blank, 0, [true, true, false]);
  saved = recordRun(saved, 0, [true, false, true]);
  assert.equal(stars(saved.runs[0]), 2);
  assert.deepEqual(saved.runs[0], [true, true, false]);
  assert.ok(isUnlocked(saved, 1)); assert.ok(!isUnlocked(saved, 2));
  saved = recordRun(saved, 1, [true, false, false]);
  assert.ok(isUnlocked(saved, 2));
  assert.deepEqual(parseProgress(JSON.stringify(saved)), saved);
  assert.throws(() => parseProgress('{bad'));
  assert.throws(() => parseProgress('{"version":1,"runs":{"0":[true,"yes",false]}}'));
  assert.deepEqual(parseProgress(null), blank);
});

const newRoutes = [
  [[{ x: 5, z: -10 }], [{ x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: -6, z: -10 }], [{ x: -7, z: -14 }, { x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: 5, z: -9 }], [{ x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: -4, z: 1 }, { x: 0, z: -6 }], [{ x: -7, z: -10 }], [{ x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: 6, z: 0 }], [{ x: -6, z: -8 }], [{ x: 6, z: -11 }], [{ x: -2.25, z: -18, height: 3.5 }]],
];
newRoutes.forEach((route, i) => test(`new level ${i + 6} has a three-star route with powerups and 2–4 decisions`, () => {
  const g = new Game(i + 5);
  for (const points of route) {
    pause(g);
    if (g.availablePowerup) g.activatePowerup();
    g.release([g.puck, ...points], 0.3);
  }
  until(g, x => x.terminal);
  assert.equal(g.phase, 'SUCCESS', g.message);
  assert.equal(g.objectives.filter(o => o.complete).length, 3, JSON.stringify(g.objectives));
  assert.ok(route.length >= 2 && route.length <= 4);
}));

test('powerups require an eligible pause, survive canceled input, and consume only one action', () => {
  const g = new Game(7);
  g.activatePowerup(); assert.equal(g.armed, null);
  pause(g); g.activatePowerup(); assert.equal(g.armed, 'freeze');
  g.release([g.puck]); assert.equal(g.armed, 'freeze');
  const defense = g.defenders.map(p => ({ ...p }));
  g.release([g.puck, { x: 5, z: -9 }]);
  while (g.phase === 'EXECUTING_ACTION') { g.update(1 / 60); assert.deepEqual(g.defenders, defense); }
  assert.ok(g.paused); assert.equal(g.frozenActions, 1); assert.equal(g.actionPower, null);
  assert.equal(g.availablePowerup, undefined);
  const retry = new Game(7); assert.equal(retry.frozenActions, 0); pause(retry); assert.equal(retry.availablePowerup, 'freeze');
});

test('Fire Puck rejects a pass without consuming the charge and keeps swept collisions', () => {
  const g = new Game(5); pause(g); g.release([g.puck, { x: 5, z: -10 }]); pause(g);
  g.activatePowerup(); g.release([g.puck, g.targets[0]]);
  assert.ok(g.paused); assert.equal(g.armed, 'fire');
  g.defenders = [{ x: 3.1, z: -13 }, { x: -9, z: 4 }];
  g.release([g.puck, { x: 0, z: -18 }], 0.1);
  until(g, x => x.terminal || x.phase === 'REBOUND');
  assert.equal(g.phase, 'FAIL'); assert.match(g.message, /PICKED OFF/);
});

test('Mega Curve preview amplifies bends, preserves endpoints, and matches execution', () => {
  const g = new Game(6); pause(g); g.release([g.puck, { x: -6, z: -10 }]); pause(g);
  const raw = [g.puck, { x: -7, z: -14 }, { x: -2.25, z: -18, height: 3.5 }];
  g.aim(raw); const normal = g.preview.map(p => ({ ...p }));
  g.activatePowerup(); g.aim(raw);
  assert.ok(g.preview[1].x < normal[1].x);
  assert.deepEqual(g.preview[0], normal[0]); assert.deepEqual(g.preview.at(-1), normal.at(-1));
  const preview = g.preview.map(p => ({ ...p })); g.release(raw);
  assert.deepEqual(g.path, preview);
});

test('three authored decisions, assisted passing, then a corner goal', () => {
  const g = shootingSetup();
  g.release([g.puck, { x: -4, z: -14 }, { x: 2.25, z: -18, height: 3.5 }], 0.3);
  until(g, x => x.terminal);
  assert.equal(g.phase, 'SUCCESS');
  assert.ok(g.objectives.every(o => o.complete));
});
test('full freeze includes every simulation field while waiting and drawing', () => {
  const g = new Game(); pause(g);
  g.aim([g.puck, { x: 8, z: 3 }, { x: 6, z: 4 }]);
  const before = JSON.stringify(g);
  for (let i = 0; i < 200; i++) g.update(0.05);
  assert.equal(JSON.stringify(g), before);
});
test('a pass into live coverage is intercepted; a wide curve avoids the defender', () => {
  const g = new Game(); passOne(g);
  g.release([g.puck, { ...g.defenders[0] }]); until(g, x => x.terminal);
  assert.equal(g.phase, 'FAIL'); assert.match(g.message, /PICKED OFF/);
  assert.equal(shootingSetup().stage, 2);
});
test('center shot creates exactly one guided rebound decision; corner converts', () => {
  const g = shootingSetup();
  g.release([g.puck, { x: 0, z: -18 }]); pause(g);
  assert.equal(g.reboundUsed, true); assert.equal(g.stage, 2);
  assert.ok(distance(g.puck, { x: 6, z: -11.5 }) < 0.001);
  g.release([g.puck, { x: -2.25, z: -18, height: 3.5 }]); until(g, x => x.terminal);
  assert.equal(g.phase, 'SUCCESS');
});
test('second save ends the run instead of producing unlimited rebounds', () => {
  const g = shootingSetup();
  g.release([g.puck, { x: 0, z: -18 }]); pause(g);
  g.release([g.puck, { x: 0, z: -18 }]); until(g, x => x.terminal);
  assert.equal(g.phase, 'FAIL'); assert.match(g.message, /DENIED/);
});
test('wide shots fail, loose passes stay recoverable, and retry resets everything', () => {
  const g = shootingSetup(); g.release([g.puck, { x: -7, z: -18 }]); until(g, x => x.terminal);
  assert.match(g.message, /WIDE/);
  const fresh = new Game(); pause(fresh); fresh.release([fresh.puck, { x: -8, z: 10 }]); until(fresh, x => x.terminal || x.paused);
  assert.ok(fresh.paused || /PICKED OFF/.test(fresh.message));
  const retry = new Game(); assert.equal(retry.stage, 0); assert.equal(retry.reboundUsed, false); assert.equal(retry.phase, 'AUTO_PLAY');
});
test('pass assist preserves extravagant loops and snaps only the endpoint', () => {
  const raw = [{ x: 0, z: 10 }, { x: 9, z: 12 }, { x: -9, z: 8 }, { x: 8, z: -3 }, { x: 6.5, z: 4.5 }];
  const p = cleanPath(raw, { x: 6, z: 4 });
  assert.deepEqual(p[0], raw[0]); assert.deepEqual(p.at(-1), { x: 6, z: 4 });
  assert.ok(p.some(x => x.x < -6)); assert.ok(p.some(x => x.x > 7));
});
test('pass assistance follows stroke distance rather than touch sample count', () => {
  const path = cleanPath([
    { x: 0, z: 0 }, { x: 1, z: 0 }, { x: 9, z: 0 }, { x: 10, z: 0 },
  ], { x: 10, z: 1 });
  // The third sample is 90% through the stroke, even though it is only the
  // second interior array entry. It receives the final-quarter correction.
  assert.equal(path[1].z, 0);
  assert.ok(path[2].z > 0.1);
  assert.deepEqual(path.at(-1), { x: 10, z: 1 });
});
test('tap and canceled strokes keep the decision open', () => {
  const g = new Game(); pause(g); g.release([g.puck]); assert.ok(g.paused);
  g.aim([g.puck, { x: 6, z: 4 }]); g.cancel(); assert.ok(g.paused); assert.equal(g.preview.length, 0);
});
test('fast execution still detects defender collision', () => {
  const g = new Game(); passOne(g); g.release([g.puck, { ...g.defenders[0] }], 0.01);
  for (let i = 0; i < 100 && !g.terminal; i++) g.update(0.05);
  assert.equal(g.phase, 'FAIL'); assert.match(g.message, /PICKED OFF/);
});

test('relative gestures preserve screen displacement independently of touch origin', () => {
  const anchor = { x: 140, y: 180 };
  const curve = [{ x: 0, y: 0 }, { x: -40, y: -30 }, { x: 60, y: -150 }];
  const draw = start => curve.map(delta => {
    const finger = { x: start.x + delta.x, y: start.y + delta.y };
    return relativeAim(anchor, finger.x - start.x, finger.y - start.y);
  });
  assert.deepEqual(draw(anchor), draw({ x: 120, y: 650 }));
  assert.deepEqual(draw(anchor)[0], anchor);
});

test('preview and execution always begin at the current puck', () => {
  const g = new Game(); pause(g);
  const puck = { ...g.puck };
  g.aim([{ x: 9, z: 20 }, { x: 6.4, z: 4.3 }]);
  assert.deepEqual(g.preview[0], puck);
  assert.deepEqual(g.preview.at(-1), { x: 6.4, z: 4.3 });
  g.release([{ x: 9, z: 20 }, { x: 6.4, z: 4.3 }]);
  assert.deepEqual(g.path[0], puck);
  g.update(1 / 60);
  assert.ok(distance(g.puck, puck) < 0.5);
});

test('cancel or duplicate release during flight preserves the pass and resume', () => {
  const g = new Game(); pause(g);
  g.release([g.puck, g.attackers[1]]);
  g.update(0.05); const puck = { ...g.puck };
  g.cancel(); g.release([]);
  assert.equal(g.intent.kind, 'pass');
  assert.deepEqual(g.puck, puck);
  pause(g); assert.equal(g.stage, 1);
});

const routes = [
  [ // Hook around the stick, then finish.
    [{ x: -5, z: 2 }, { x: -3, z: -4 }, { x: 5, z: -6 }],
    [{ x: -2.25, z: -18, height: 3.5 }],
  ],
  [ // Cross-ice reception is an immediate shooting pause.
    [{ x: 7, z: -10 }], [{ x: 2.5, z: -18 }],
  ],
  [ // Outside both lanes, switch sides, curl around shooting traffic.
    [{ x: -7, z: 7 }, { x: -9, z: 1 }, { x: -7, z: -2 }],
    [{ x: -4, z: -2 }, { x: 5, z: -3 }, { x: 7, z: -9 }],
    [{ x: 7, z: -13 }, { x: 6, z: -16 }, { x: 2.25, z: -18, height: 3.5 }],
  ],
  [ // Intentional save followed by the guided rebound.
    [{ x: 0, z: -10 }], [{ x: 0, z: -18 }], [{ x: -2.25, z: -18, height: 3.5 }],
  ],
];
routes.forEach((route, i) => test(`handcrafted level ${i + 2} has a playable route with 2–4 pauses`, () => {
  const g = new Game(i + 1); let decisions = 0;
  for (const points of route) {
    pause(g); decisions++;
    assert.ok(distance(g.puck, g.attackers[g.carrier]) <= g.reception.pickupRadius);
    g.release([g.puck, ...points], 0.8);
    if (i === 1 && decisions === 1) {
      until(g, x => x.phase !== 'EXECUTING_ACTION');
      assert.ok(g.paused); assert.equal(g.stage, 1);
      assert.ok(distance(g.puck, { x: 7, z: -10 }) <= g.reception.pickupRadius);
    }
  }
  until(g, x => x.terminal);
  assert.equal(g.phase, 'SUCCESS', g.message);
  assert.ok(decisions >= 2 && decisions <= 4);
  assert.equal(g.reboundUsed, i === 3);
}));

routes.forEach((route, i) => test(`original level ${i + 2} can earn all three stars in one run`, () => {
  const g = new Game(i + 1);
  const threeStarRoute = i === 1 ? [route[0], [{ x: 2.25, z: -18, height: 3.5 }]] : route;
  for (const points of threeStarRoute) { pause(g); g.release([g.puck, ...points], 0.3); }
  until(g, x => x.terminal);
  assert.equal(g.phase, 'SUCCESS', g.message);
  assert.ok(g.objectives.every(o => o.complete), JSON.stringify(g.objectives));
}));

test('retry every level clears action, rebound, goalie, timers, and preview state', () => {
  LEVELS.forEach((_, i) => {
    const old = new Game(i); pause(old);
    old.release([old.puck, old.attackers[1]]); old.update(0.05);
    const fresh = new Game(old.levelIndex);
    assert.equal(fresh.levelIndex, i);
    assert.deepEqual(fresh, new Game(i));
    assert.equal(fresh.phase, 'AUTO_PLAY');
    assert.equal(fresh.reboundUsed, false);
    assert.equal(fresh.path.length, 0);
    pause(fresh); assert.deepEqual(fresh.puck, fresh.moment.carrier);
  });
});

test('swipe speed affects execution while leaving the authored curve intact', () => {
  const fast = new Game(), slow = new Game(); pause(fast); pause(slow);
  const path = [fast.puck, { x: 6, z: 4 }];
  fast.release(path, 0.1); slow.release(path, 3);
  assert.deepEqual(fast.path, slow.path);
  fast.update(0.05); slow.update(0.05);
  assert.ok(distance(fast.puck, path[0]) > distance(slow.puck, path[0]));
});

test('release moves defenders; reception freezes immediately without moving the receiver', () => {
  const g = new Game(); pause(g);
  const defense = g.defenders.map(p => ({ ...p }));
  const receiver = { ...g.attackers[1] };
  g.release([g.puck, receiver]);
  assert.deepEqual(g.defenders, defense);
  g.update(0.05);
  assert.ok(g.defenders.every((p, i) => distance(p, defense[i]) > 0));
  assert.ok(g.defenders.every((p, i) => distance(p, defense[i]) <= 0.240001));
  assert.deepEqual(g.attackers[1], receiver);
  while (g.phase === 'EXECUTING_ACTION') {
    g.update(1 / 60);
    assert.deepEqual(g.attackers[1], receiver);
  }
  assert.equal(g.phase, 'PAUSED_FOR_INPUT');
  assert.equal(g.stage, 1);
  assert.ok(distance(g.puck, receiver) <= g.reception.pickupRadius);
  assert.deepEqual(g.trail, []);
  assert.deepEqual(g.path, []);
  const frozen = JSON.stringify(g);
  for (let i = 0; i < 120; i++) g.update(0.05);
  assert.equal(JSON.stringify(g), frozen);
  g.release([g.puck, { x: 4, z: 3 }, { x: -5, z: 2 }, { x: -7, z: -3 }, { x: -6, z: -7 }]);
  const secondDefense = g.defenders.map(p => ({ ...p }));
  g.update(0.05);
  assert.ok(g.defenders.some((p, i) => distance(p, secondDefense[i]) > 0));
});

test('moving defender interception remains consistent across simulation frame sizes', () => {
  for (const dt of [1 / 120, 1 / 60, 0.05]) {
    const g = new Game(); passOne(g);
    g.release([g.puck, { ...g.defenders[0] }], 0.1);
    for (let i = 0; i < 1000 && !g.terminal; i++) g.update(dt);
    assert.equal(g.phase, 'FAIL');
    assert.match(g.message, /PICKED OFF/);
  }
});

function assertSpacing(points) {
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    assert.ok(distance(points[i], points[j]) >= SKATER_SPACING - 0.001, `Skaters ${i}/${j} overlap: ${JSON.stringify(points)}`);
  }
}

test('coincident support destinations separate without displacing the receiver', () => {
  const receiver = { x: 7, z: -10 };
  const resolved = spaceSkaters([receiver, receiver, receiver], 1);
  assert.deepEqual(resolved[1], receiver);
  assertSpacing(resolved);
  assertSpacing(spaceSkaters(Array.from({ length: 5 }, () => ({ x: 9.5, z: -10 })), 0));
});

test('skaters stay separated throughout every authored route and reception', () => {
  routes.forEach((route, index) => {
    const g = new Game(index + 1);
    const update = g.update.bind(g);
    g.update = dt => { update(dt); assertSpacing([...g.attackers, ...g.defenders]); };
    for (const points of route) { pause(g); g.release([g.puck, ...points], 0.8); }
    until(g, x => x.terminal);
    assert.equal(g.phase, 'SUCCESS');
  });
});

function clearShootingSetup(stage = 0) {
  const g = new Game(); pause(g);
  g.stage = stage;
  g.goalieGlove = { ...g.coveredCorner, z: g.goalie.z };
  g.puck = { x: 0, z: -10 }; g.attackers[0] = { ...g.puck };
  g.defenders = [{ x: -9, z: 8 }, { x: 9, z: 8 }];
  return g;
}

test('all four corners can beat a wrong-footed goalie, and actual glove contact saves', () => {
  GOAL_CORNERS.forEach((corner, index) => {
    const open = clearShootingSetup();
    open.puck = { x: 0, z: -13 }; open.attackers[0] = { ...open.puck };
    open.goalieGlove = { ...GOAL_CORNERS[index ^ 1], z: open.goalie.z };
    assert.equal(open.cornerCovered(corner), false);
    open.release([open.puck, corner]);
    until(open, g => g.terminal || g.phase === 'REBOUND');
    assert.equal(open.phase, 'SUCCESS', corner.label);

    const blocked = clearShootingSetup();
    blocked.puck = { x: 0, z: -13 }; blocked.attackers[0] = { ...blocked.puck };
    blocked.goalieGlove = { ...corner, z: blocked.goalie.z };
    assert.equal(blocked.cornerCovered(corner), true);
    blocked.release([blocked.puck, corner]);
    until(blocked, g => g.terminal || g.phase === 'REBOUND');
    assert.equal(blocked.phase, 'REBOUND', corner.label);
  });
});

test('adjusting a shot from a low to high corner replaces the goal-face tail', () => {
  const g = clearShootingSetup();
  const low = GOAL_CORNERS[1], high = GOAL_CORNERS[3];
  g.aim([g.puck, { x: 1, z: -14 }, low, high]);
  assert.equal(g.preview.length, 3);
  assert.deepEqual(g.preview[0], g.puck);
  assert.equal(g.preview.at(-1).height, high.height);
  assert.equal(g.preview.filter(p => p.z <= -18).length, 1);
  g.release([g.puck, { x: 1, z: -14 }, low, high]);
  until(g, x => x.terminal);
  assert.equal(g.phase, 'SUCCESS');
  assert.ok(g.puck.height > 3);
});

test('shots over the taller crossbar miss and high saves return the puck to the ice', () => {
  const over = clearShootingSetup();
  over.release([over.puck, { x: 2.25, z: -18, height: NET_HEIGHT + 0.5 }]);
  until(over, g => g.terminal);
  assert.match(over.message, /OVER THE BAR/);
  const saved = clearShootingSetup(2);
  saved.release([saved.puck, GOAL_CORNERS[2]]); pause(saved);
  assert.ok(saved.reboundUsed);
  assert.equal(saved.puck.height ?? 0, 0);
  assert.deepEqual(saved.puck, saved.attackers[saved.carrier]);
  assertSpacing([...saved.attackers, ...saved.defenders]);
});

test('goalie reads long straight shots into every corner, but a late curve beats the commitment', () => {
  for (const dt of [1 / 120, 1 / 60, 0.05]) {
    for (const corner of GOAL_CORNERS) {
      const g = clearShootingSetup();
      g.puck = { x: 0, z: 4 }; g.attackers[0] = { ...g.puck };
      g.defenders = [{ x: -9, z: 15 }, { x: 9, z: 15 }];
      g.release([g.puck, corner], 0.3);
      for (let i = 0; i < 1000 && g.phase === 'EXECUTING_ACTION'; i++) g.update(dt);
      assert.equal(g.phase, 'REBOUND', `${corner.label}, dt ${dt}`);
    }
    const bent = clearShootingSetup();
    bent.puck = { x: 0, z: 4 }; bent.attackers[0] = { ...bent.puck };
    bent.defenders = [{ x: -9, z: 15 }, { x: 9, z: 15 }];
    bent.release([bent.puck, { x: 5, z: -15 }, GOAL_CORNERS[0]], 0.3);
    for (let i = 0; i < 1000 && bent.phase === 'EXECUTING_ACTION'; i++) bent.update(dt);
    assert.equal(bent.phase, 'SUCCESS');
  }
});

test('quicker release can beat the glove on a shot that is saved at a slower speed', () => {
  const quick = clearShootingSetup(), slow = clearShootingSetup();
  for (const [game, seconds] of [[quick, 0.1], [slow, 3]]) {
    game.puck = { x: 0, z: -9 }; game.attackers[0] = { ...game.puck };
    game.release([game.puck, GOAL_CORNERS[1]], seconds);
    until(game, g => g.terminal || g.phase === 'REBOUND');
  }
  assert.equal(quick.phase, 'SUCCESS');
  assert.equal(slow.phase, 'REBOUND');
});

test('goalie reacts to current travel, not the unseen endpoint, and freezes with the play', () => {
  const left = clearShootingSetup(), right = clearShootingSetup();
  for (const [game, side] of [[left, -1], [right, 1]]) {
    game.puck = { x: 0, z: 4 }; game.attackers[0] = { ...game.puck };
    game.release([game.puck, { x: 0, z: 0 }, { x: 0, z: -8 }, { x: side * 8, z: -12 }, { x: side * 2.25, z: -18 }]);
    const start = { ...game.goalie };
    for (let i = 0; i < 10; i++) {
      game.update(1 / 60);
      assert.ok(Math.abs(game.goalieVelocity) <= 6.5);
    }
    assert.ok(distance(start, game.goalie) < 0.2);
  }
  assert.deepEqual(left.goalie, right.goalie);
  assert.deepEqual(left.goalieGlove, right.goalieGlove);
  const frozen = shootingSetup();
  const before = JSON.stringify(frozen);
  for (let i = 0; i < 120; i++) frozen.update(0.05);
  assert.equal(JSON.stringify(frozen), before);
});

function passingSetup(options = {}) {
  const g = new Game(0, options); pause(g);
  g.attackers = [{ x: 0, z: 10 }, { x: 5, z: 1 }, { x: -8, z: -10 }];
  g.defenders = [{ x: -9, z: 18 }, { x: 9, z: 18 }];
  g.puck = { ...g.attackers[0] };
  return g;
}

test('lead pass stays drawn into open space while the teammate skates to collect', () => {
  for (const dt of [1 / 120, 1 / 60, 0.05]) {
    const g = passingSetup(), start = { ...g.attackers[1] };
    const raw = [g.puck, { x: 0, z: -1 }, { x: 8, z: -2 }];
    g.aim(raw);
    assert.equal(g.intent.kind, 'loose');
    assert.deepEqual(g.preview.at(-1), raw.at(-1));
    g.release(raw, 0.5);
    for (let i = 0; i < 1000 && g.phase === 'EXECUTING_ACTION'; i++) {
      const player = { ...g.attackers[1] }, puck = { ...g.puck };
      g.update(dt);
      assert.ok(distance(player, g.attackers[1]) <= g.reception.skateSpeed * dt + 0.001);
      assert.ok(distance(puck, g.puck) <= 28 * dt + 0.001, 'reception must not teleport the puck');
    }
    assert.ok(g.paused, g.message); assert.equal(g.carrier, 1);
    assert.ok(distance(start, g.attackers[1]) > 2);
    assert.ok(g.puck.z < start.z);
    assert.ok(distance(g.puck, g.attackers[1]) <= g.reception.pickupRadius);
    assert.ok(distance(g.puck, raw.at(-1)) > 1, 'pickup happens along the route, not at its end');
    assert.equal(g.passes, 1);
    const frozen = JSON.stringify(g); g.update(0.05); assert.equal(JSON.stringify(g), frozen);
  }
});

test('shot releases classify snapshots, one-timers, screens, curves, and rebounds', () => {
  const shot = (configure, path, seconds = 0.3) => {
    const game = clearShootingSetup();
    configure(game);
    game.release([game.puck, ...path], seconds);
    return game;
  };
  const target = { x: 2.25, z: -18, height: 3.5 };
  const snapshot = shot(() => {}, [target]);
  assert.equal(snapshot.shotStyle, 'snapshot'); assert.equal(snapshot.event, 'snapshot');
  const oneTimer = shot(game => { game.stage = 1; }, [target]);
  assert.equal(oneTimer.shotStyle, 'oneTimer'); assert.equal(oneTimer.event, 'oneTimer');
  const screen = shot(game => { game.defenders = [{ x: 1, z: -13 }, { x: -9, z: 8 }]; }, [target], 0.8);
  assert.equal(screen.shotStyle, 'screen'); assert.equal(screen.event, 'screenShot');
  const curve = shot(() => {}, [{ x: -7, z: -13 }, target], 0.8);
  assert.equal(curve.shotStyle, 'curve'); assert.equal(curve.event, 'curveShot');
  const rebound = shot(game => { game.reboundUsed = true; }, [target]);
  assert.equal(rebound.shotStyle, 'rebound'); assert.equal(rebound.event, 'reboundShot');
});

test('super-close pass keeps puck travel visible and bounds every skater step', () => {
  for (const dt of [1 / 120, 1 / 60, 0.05]) {
    const g = passingSetup({ skateSpeed: 7.8 });
    // Start outside the normal hard-spacing radius so this isolates the
    // short-pass route compression seen in real authored setups.
    g.attackers[1] = { x: 1.9, z: 10 };
    g.puck = { x: 0, z: 10 }; g.attackers[0] = { ...g.puck };
    g.release([g.puck, { x: 2, z: 10 }], 0.1);
    const puckStart = { ...g.puck };
    const skatersStart = [...g.attackers, ...g.defenders].map(p => ({ ...p }));
    g.update(dt);
    assert.ok(distance(puckStart, g.puck) > 0.001 || g.trail.some(point => distance(puckStart, point) > 0.001),
      `puck did not visibly travel at dt ${dt}`);
    [...g.attackers, ...g.defenders].forEach((player, i) => {
      assert.ok(distance(player, skatersStart[i]) <= 8 * dt + 0.002,
        `skater ${i} snapped ${distance(player, skatersStart[i])} at dt ${dt}`);
    });
  }
});

test('goal-mouth slow motion applies to shots only', () => {
  const pass = passingSetup({ skateSpeed: 0 });
  pass.release([pass.puck, { x: 0, z: -15.5 }]);
  while (pass.puck.z >= -14) pass.update(1 / 60);
  const passStart = { ...pass.puck };
  pass.update(1 / 60);

  const shot = passingSetup({ skateSpeed: 0 });
  shot.release([shot.puck, { x: 0, z: -18 }]);
  while (shot.puck.z >= -14) shot.update(1 / 60);
  const shotStart = { ...shot.puck };
  shot.update(1 / 60);

  assert.ok(distance(passStart, pass.puck) > distance(shotStart, shot.puck) * 1.8,
    'a deep pass should retain full speed while a shot enters the slow zone');
});

test('a good pass is met by a receiver instead of being shadowed', () => {
  const g = passingSetup();
  const raw = [g.puck, { x: 0, z: 2 }, { x: 5, z: -8 }];
  g.release(raw, 0.5);
  let separatedFrames = 0;
  for (let i = 0; i < 40 && g.phase === 'EXECUTING_ACTION'; i++) {
    g.update(1 / 60);
    if (distance(g.puck, g.attackers[1]) > 0.2) separatedFrames++;
  }
  assert.ok(separatedFrames >= 5, 'receiver should approach a contact point ahead of the puck');
  for (let i = 0; i < 600 && !g.paused && !g.terminal; i++) g.update(1 / 60);
  assert.equal(g.phase, 'PAUSED_FOR_INPUT');
  assert.equal(g.carrier, 1);
});

test('pickup radius is configurable and skaters can recover beyond initial pursuit range', () => {
  for (const radius of [0.4, 1.2]) {
    const g = passingSetup({ pickupRadius: radius, skateSpeed: 0 });
    g.attackers[1] = { x: 1, z: 4 };
    g.release([g.puck, { x: 0, z: 0 }]);
    until(g, x => x.paused || x.terminal);
    assert.equal(g.phase, radius > 1 ? 'PAUSED_FOR_INPUT' : 'FAIL');
    assert.equal(g.passes, radius > 1 ? 1 : 0);
  }
  const missed = passingSetup({ pursuitRadius: 1 });
  missed.release([missed.puck, { x: 3, z: -5 }]);
  until(missed, g => g.paused || g.terminal);
  assert.equal(missed.phase, 'PAUSED_FOR_INPUT'); assert.equal(missed.passes, 1);
});

test('a teammate along the route receives before the teammate near the endpoint', () => {
  const g = passingSetup({ skateSpeed: 0 });
  g.attackers = [g.puck, { x: 0, z: 4 }, { x: 0, z: -3 }];
  g.release([g.puck, g.attackers[2]]);
  assert.equal(g.intent.kind, 'pass'); assert.equal(g.intent.target, 2);
  pause(g); assert.equal(g.carrier, 1);
  assert.ok(g.puck.z > 3); assert.equal(g.passes, 1);
});

test('near-miss assistance is tiny and does not pull the endpoint onto a teammate', () => {
  const g = passingSetup();
  const end = { x: 6.2, z: 1 };
  g.aim([g.puck, { x: -4, z: 7 }, end]);
  assert.ok(distance(end, g.preview.at(-1)) <= g.reception.maxAssist + 0.000001);
  assert.ok(distance(g.attackers[1], g.preview.at(-1)) > g.reception.pickupRadius);
  assert.ok(g.preview[1].x < -3, 'the curve must remain visible');
  const obviousHit = { x: 5.4, z: 1 };
  g.aim([g.puck, obviousHit]); assert.deepEqual(g.preview.at(-1), obviousHit);
});

test('puck coasts after an open-space endpoint and can be collected afterward', () => {
  const g = passingSetup({ skateSpeed: 0 });
  g.attackers[1] = { x: 0, z: -3 };
  const raw = [g.puck, { x: 0, z: 0 }];
  g.release(raw);
  until(g, x => x.puck.z <= 0 || x.terminal);
  assert.equal(g.phase, 'EXECUTING_ACTION'); assert.equal(g.passes, 0);
  pause(g); assert.equal(g.carrier, 1); assert.ok(g.puck.z < -2);
});

test('drawing beyond first board contact cannot steer or preview the rebound', () => {
  const first = passingSetup(), second = passingSetup();
  const raw = [first.puck, { x: 18, z: 12 }];
  const tail = [...raw, { x: -8, z: -12 }, { x: 4, z: 8 }];
  first.aim(raw); second.aim(tail);
  assert.deepEqual(first.preview, second.preview);
  assert.equal(first.preview.filter(p => p.bounce).length, 1);
  assert.ok(first.preview.at(-1).bounce);
  first.release(raw, 0.5); second.release(tail, 0.5);
  for (let i = 0; i < 240 && !first.terminal && !first.paused; i++) {
    first.update(1 / 60); second.update(1 / 60);
    assert.deepEqual(first.puck, second.puck);
    assert.equal(first.phase, second.phase);
  }
});

test('runtime bank reflection preserves incoming angle at side and corner impacts', () => {
  for (const end of [{ x: 18, z: 4 }, { x: BOARD_X * 2, z: BOARD_Z * 2 }]) {
    const g = passingSetup({ pickupRadius: 0.1, pursuitRadius: 0, skateSpeed: 0 });
    g.puck = { x: 0, z: 0 }; g.attackers[0] = { ...g.puck };
    g.defenders = [{ x: -9, z: -12 }, { x: 9, z: -12 }];
    g.release([g.puck, end]);
    g.actionPower = 'freeze'; // Isolate reflection from the new defender pursuit.
    until(g, x => x.event === 'bank' || x.terminal);
    assert.equal(g.event, 'bank');
    const after = { ...g.puck }; g.update(1 / 120);
    const dx = g.puck.x - after.x, dz = g.puck.z - after.z;
    assert.ok(dx < 0);
    assert.equal(Math.sign(dz), end.z > BOARD_Z ? -1 : 1);
    assert.ok(Math.abs(Math.abs(dz / dx) - Math.abs(end.z / end.x)) < 0.001);
    assert.equal(g.preview.length, 0);
  }
});

test('cancel during a bank does not erase motion, and retry resets all reception state', () => {
  const g = passingSetup();
  g.release([g.puck, { x: 18, z: 12 }]);
  until(g, x => x.event === 'bank' || x.terminal || x.paused);
  assert.equal(g.event, 'bank');
  const puck = { ...g.puck }; g.cancel(); g.release([]); g.update(1 / 60);
  assert.ok(distance(g.puck, puck) > 0);
  const reset = new Game(g.levelIndex);
  assert.deepEqual(reset, new Game());
  assert.equal(reset.passes, 0); assert.equal(reset.path.length, 0);
});
