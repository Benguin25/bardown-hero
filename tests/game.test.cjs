const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, LEVELS, relativeAim, cleanPath, distance } = require('../.test-build/game.js');

function until(game, predicate, limit = 4000) {
  for (let i = 0; i < limit && !predicate(game); i++) game.update(1 / 60);
  assert.ok(predicate(game), `Timed out in ${game.phase}: ${game.message}`);
}
function pause(game) { until(game, g => g.paused || g.terminal); assert.equal(game.phase, 'PAUSED_FOR_INPUT'); }
function passOne(game) { pause(game); game.release([game.puck, { x: 6, z: 4 }]); pause(game); }
function shootingSetup() {
  const g = new Game(); passOne(g);
  g.release([g.puck, { x: 4, z: 3 }, { x: -5, z: 2 }, { x: -7, z: -3 }, { x: -6, z: -7 }]);
  pause(g); assert.equal(g.stage, 2); return g;
}

test('three authored decisions, assisted passing, then a corner goal', () => {
  const g = shootingSetup();
  g.release([g.puck, { x: -2.5, z: -18 }]);
  until(g, x => x.terminal);
  assert.equal(g.phase, 'SUCCESS');
});
test('full freeze includes every simulation field while waiting and drawing', () => {
  const g = new Game(); pause(g);
  g.aim([g.puck, { x: 8, z: 3 }, { x: 6, z: 4 }]);
  const before = JSON.stringify(g);
  for (let i = 0; i < 200; i++) g.update(0.05);
  assert.equal(JSON.stringify(g), before);
});
test('a straight second pass is intercepted; the curve avoids the defender', () => {
  const g = new Game(); passOne(g);
  g.release([g.puck, { x: -6, z: -7 }]); until(g, x => x.terminal);
  assert.equal(g.phase, 'FAIL'); assert.match(g.message, /PICKED OFF/);
  assert.equal(shootingSetup().stage, 2);
});
test('center shot creates exactly one guided rebound decision; corner converts', () => {
  const g = shootingSetup();
  g.release([g.puck, { x: 0, z: -18 }]); pause(g);
  assert.equal(g.reboundUsed, true); assert.equal(g.stage, 2);
  assert.ok(distance(g.puck, { x: 6, z: -11.5 }) < 0.001);
  g.release([g.puck, { x: 2.5, z: -18 }]); until(g, x => x.terminal);
  assert.equal(g.phase, 'SUCCESS');
});
test('second save ends the run instead of producing unlimited rebounds', () => {
  const g = shootingSetup();
  g.release([g.puck, { x: 0, z: -18 }]); pause(g);
  g.release([g.puck, { x: 0, z: -18 }]); until(g, x => x.terminal);
  assert.equal(g.phase, 'FAIL'); assert.match(g.message, /DENIED/);
});
test('wide shots and loose passes fail, and a new game immediately resets everything', () => {
  const g = shootingSetup(); g.release([g.puck, { x: -7, z: -18 }]); until(g, x => x.terminal);
  assert.match(g.message, /WIDE/);
  const fresh = new Game(); pause(fresh); fresh.release([fresh.puck, { x: -8, z: 10 }]); until(fresh, x => x.terminal);
  assert.match(fresh.message, /LOOSE/);
  const retry = new Game(); assert.equal(retry.stage, 0); assert.equal(retry.reboundUsed, false); assert.equal(retry.phase, 'AUTO_PLAY');
});
test('pass assist preserves extravagant loops and snaps only the endpoint', () => {
  const raw = [{ x: 0, z: 10 }, { x: 9, z: 12 }, { x: -9, z: 8 }, { x: 8, z: -3 }, { x: 6.5, z: 4.5 }];
  const p = cleanPath(raw, { x: 6, z: 4 });
  assert.deepEqual(p[0], raw[0]); assert.deepEqual(p.at(-1), { x: 6, z: 4 });
  assert.ok(p.some(x => x.x < -6)); assert.ok(p.some(x => x.x > 7));
});
test('tap and canceled strokes keep the decision open', () => {
  const g = new Game(); pause(g); g.release([g.puck]); assert.ok(g.paused);
  g.aim([g.puck, { x: 6, z: 4 }]); g.cancel(); assert.ok(g.paused); assert.equal(g.preview.length, 0);
});
test('fast execution still detects defender collision', () => {
  const g = new Game(); passOne(g); g.release([g.puck, { x: -6, z: -7 }], 0.01);
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
  assert.deepEqual(g.preview.at(-1), g.attackers[1]);
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
    [{ x: 2.5, z: -18 }],
  ],
  [ // Cross-ice reception is an immediate shooting pause.
    [{ x: 7, z: -10 }], [{ x: 2.5, z: -18 }],
  ],
  [ // Outside both lanes, switch sides, curl around shooting traffic.
    [{ x: -7, z: 7 }, { x: -9, z: 1 }, { x: -7, z: -2 }],
    [{ x: -4, z: -2 }, { x: 5, z: -3 }, { x: 7, z: -9 }],
    [{ x: 7, z: -13 }, { x: 6, z: -16 }, { x: 2.5, z: -18 }],
  ],
  [ // Intentional save followed by the guided rebound.
    [{ x: 0, z: -10 }], [{ x: 0, z: -18 }], [{ x: 2.5, z: -18 }],
  ],
];
routes.forEach((route, i) => test(`handcrafted level ${i + 2} has a playable route with 2–4 pauses`, () => {
  const g = new Game(i + 1); let decisions = 0;
  for (const points of route) {
    pause(g); decisions++;
    assert.deepEqual(g.puck, g.attackers[g.carrier]);
    g.release([g.puck, ...points], 0.8);
    if (i === 1 && decisions === 1) {
      until(g, x => x.phase !== 'EXECUTING_ACTION');
      assert.ok(g.paused); assert.equal(g.stage, 1);
      assert.deepEqual(g.puck, { x: 7, z: -10 });
    }
  }
  until(g, x => x.terminal);
  assert.equal(g.phase, 'SUCCESS', g.message);
  assert.ok(decisions >= 2 && decisions <= 4);
  assert.equal(g.reboundUsed, i === 3);
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
