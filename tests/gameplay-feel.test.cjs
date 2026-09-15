const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, distance, cleanPath } = require('../.test-build/game.js');

function until(game, predicate, limit = 4000) {
  for (let i = 0; i < limit && !predicate(game); i++) game.update(1 / 60);
  assert.ok(predicate(game), `Timed out in ${game.phase}: ${game.message}`);
}
function pause(game) { until(game, g => g.paused || g.terminal); assert.equal(game.phase, 'PAUSED_FOR_INPUT'); }
function openPassingGame() {
  const game = new Game(); pause(game);
  game.attackers = [{ x: 0, z: 10 }, { x: 0, z: 0 }, { x: -8, z: -10 }];
  game.defenders = [{ x: -9, z: 18 }, { x: 9, z: 18 }];
  game.puck = { ...game.attackers[0] };
  return game;
}

test('a pass .95 units beside a stationary receiver is within the new stick reach', () => {
  const play = radius => {
    const game = openPassingGame();
    // Isolate stick reach from pursuit and the small endpoint correction.
    game.reception.skateSpeed = 0; game.reception.assistStrength = 0;
    if (radius !== undefined) game.reception.pickupRadius = radius;
    game.attackers[1] = { x: 0.95, z: 0 };
    game.release([game.puck, { x: 0, z: 0 }]);
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    return game;
  };
  const game = play();
  assert.equal(game.phase, 'PAUSED_FOR_INPUT');
  assert.equal(game.carrier, 1);
  assert.ok(distance(game.puck, game.attackers[1]) <= game.reception.pickupRadius);
  assert.equal(play(0.9).passes, 0);
});

test('a skater physically on a bank approach can take the puck before the boards', () => {
  const game = openPassingGame();
  game.attackers[1] = { x: 10.2, z: 4.625 };
  game.attackers[2] = { x: -9, z: 20 };
  game.release([game.puck, { x: 20, z: 0 }]);
  until(game, g => g.paused || g.terminal);
  assert.equal(game.phase, 'PAUSED_FOR_INPUT');
  assert.equal(game.carrier, 1);
  assert.equal(game.bankPasses, 0);
  assert.ok(!game.events.some(e => e.event === 'bank'));
});

test('a clear defender near-miss survives while direct stick contact is picked off', () => {
  const play = defender => {
    const game = openPassingGame();
    game.defenders = [defender, { x: 9, z: 18 }];
    game.release([game.puck, { x: 0, z: 0 }]);
    game.actionPower = 'freeze';
    until(game, g => g.paused || g.terminal);
    return game;
  };
  const miss = play({ x: 0.61, z: 5 });
  assert.equal(miss.phase, 'PAUSED_FOR_INPUT');
  const hit = play({ x: 0, z: 5 });
  assert.equal(hit.phase, 'FAIL');
  assert.match(hit.message, /PICKED OFF/);
});

test('auto-play and guided rebounds reach their next decision at arcade pacing', () => {
  const opening = new Game();
  until(opening, g => g.paused);
  assert.ok(opening.elapsed <= 0.95);

  const rebound = new Game(); pause(rebound);
  rebound.stage = 2;
  rebound.puck = { x: 0, z: -10 }; rebound.attackers[0] = { ...rebound.puck };
  rebound.defenders = [{ x: -9, z: 8 }, { x: 9, z: 8 }];
  rebound.release([rebound.puck, { x: 0, z: -18 }]);
  until(rebound, g => g.phase === 'REBOUND');
  const start = rebound.elapsed;
  until(rebound, g => g.paused);
  assert.ok(rebound.elapsed - start < 1.45);
});

test('Mega Curve leaves an unevenly sampled straight stroke straight', () => {
  const game = new Game(6); pause(game);
  game.armed = 'curve';
  const raw = [game.puck, { x: game.puck.x, z: game.puck.z - 0.4 }, { x: game.puck.x, z: game.puck.z - 7 }, { x: game.puck.x, z: game.puck.z - 8 }];
  game.aim(raw);
  assert.ok(game.preview.every(point => Math.abs(point.x - game.puck.x) < 1e-8));
  const unpowered = cleanPath(raw);
  game.preview.forEach((point, i) => {
    assert.ok(distance(point, unpowered[i]) < 1e-8, 'straight strokes must not acquire reverse travel from uneven sampling');
  });
});

test('a loose-puck pursuer keeps a reachable assignment across replans', () => {
  const game = openPassingGame();
  game.attackers[1] = { x: 7, z: -10 };
  game.attackers[2] = { x: -9, z: 20 };
  game.release([game.puck, { x: 0, z: -2 }]);
  game.actionPower = 'freeze';
  until(game, g => g.loosePuck || g.paused || g.terminal);
  assert.ok(game.loosePuck, game.message);
  const pursuer = game.pursuingAttacker;
  assert.ok(pursuer >= 0);
  for (let i = 0; i < 8 && game.loosePuck; i++) game.update(1 / 60);
  assert.equal(game.pursuingAttacker, pursuer);
});
