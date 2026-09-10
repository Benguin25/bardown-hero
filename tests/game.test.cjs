const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, cleanPath, distance } = require('../.test-build/game.js');

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
