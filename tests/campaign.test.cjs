const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, LEVELS, distance } = require('../.test-build/game.js');
// Replay authored bank, lead, curve, powerup and rebound routes end-to-end.
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

const newRoutes = [
  [[{ x: 5, z: -10 }], [{ x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: -6, z: -10 }], [{ x: -7, z: -14 }, { x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: 5, z: -9 }], [{ x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: -4, z: 1 }, { x: 0, z: -6 }], [{ x: -7, z: -10 }], [{ x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: 6, z: 0 }], [{ x: -6, z: -8 }], [{ x: 6, z: -11 }], [{ x: -2.25, z: -18, height: 3.5 }]],
];

const highlightRoutes = [
  [[{ x: 5, z: -7 }], [{ x: 2.25, z: -18, height: 3.5 }]],
  [[{ x: 15.5, z: -5 }], [{ x: -6, z: -10 }], [{ x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: -7, z: 5 }, { x: -9, z: 0 }, { x: -7, z: -3 }], [{ x: 7, z: -10 }], [{ x: 2.25, z: -18, height: 3.5 }]],
  [[{ x: 0, z: -10 }], [{ x: 0, z: -18 }], [{ x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: 6, z: -5 }], [{ x: -6, z: -9 }], [{ x: -8, z: -16 }, { x: -2.25, z: -18, height: 3.5 }]],
  [[{ x: 15.5, z: -5 }], [{ x: -6, z: -9 }], [{ x: 6, z: -9 }], [{ x: -2.25, z: -18, height: 3.5 }]],
];
const opening = [
  [{ x: 6, z: 4 }],
  [{ x: 4, z: 6 }, { x: -8, z: 6 }, { x: -8, z: -7 }, { x: -6, z: -7 }],
  [{ x: -4, z: -14 }, { x: 2.25, z: -18, height: 3.5 }],
];
const campaign = [opening, ...routes.map((route, i) => i === 1
  ? [route[0], [{ x: 2.25, z: -18, height: 3.5 }]] : route), ...newRoutes, ...highlightRoutes];
for (const fps of [120, 60, 30, 20]) {
  test('all 16 authored three-star routes remain playable at ' + fps + ' fps', () => {
    assert.equal(campaign.length, LEVELS.length);
    campaign.forEach((route, level) => {
      const game = new Game(level);
      const label = 'Level ' + (level + 1);
      const settle = () => {
        for (let frame = 0; frame < fps * 30 && !game.paused && !game.terminal; frame++) game.update(1 / fps);
        assert.ok(game.paused || game.terminal, label + ' stalled: ' + game.message);
      };
      settle();
      route.forEach((points, decision) => {
        assert.ok(game.paused, label + ', decision ' + (decision + 1) + ': ' + game.message);
        assert.ok(distance(game.puck, game.attackers[game.carrier]) <= game.reception.pickupRadius + 1e-6);
        if (game.availablePowerup) game.activatePowerup();
        game.release([game.puck, ...points], 0.3);
        settle();
      });
      assert.equal(game.phase, 'SUCCESS', label + ': ' + game.message);
      assert.ok(game.objectives.every(o => o.complete), label + ': ' + JSON.stringify(game.objectives));
    });
  });
}
