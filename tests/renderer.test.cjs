const { test } = require('node:test');
const assert = require('node:assert/strict');
const { WebGLRenderer } = require('three');
const THREE = require('three');
const { Rink, frameRink } = require('../.test-build/rink.js');
const { Game, LEVELS, GOAL_CORNERS, NET_Z, NET_HEIGHT } = require('../.test-build/game.js');

test('native GL contexts reach initialization without the r163 WebGL1 rejection', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'WebGLRenderingContext');
  // Exercise the actual Three constructor at the boundary that failed on iPhone.
  // Stop at the first GL query: this test does not pretend to emulate a GPU.
  const reachedGL = new Error('Reached native GL attribute query');
  class NativeContext {
    getContextAttributes() { throw reachedGL; }
  }
  // Expo's EXWebGLRenderer.cpp gives WebGL2 the WebGL1 prototype, too.
  class NativeWebGL2Context extends NativeContext {}
  globalThis.WebGLRenderingContext = NativeContext;
  try {
    for (const Context of [NativeContext, NativeWebGL2Context]) {
      assert.throws(
        () => new WebGLRenderer({ canvas: {}, context: new Context() }),
        error => error === reachedGL,
      );
    }
  } finally {
    if (original) Object.defineProperty(globalThis, 'WebGLRenderingContext', original);
    else delete globalThis.WebGLRenderingContext;
  }
});

test('screen aiming hits each elevated corner at multiple phone viewport sizes', () => {
  // Exercise the actual projection/input methods without pretending to emulate GL.
  for (const [width, height] of [[320, 420], [390, 600], [430, 680]]) {
    const rink = Object.create(Rink.prototype);
    rink.width = width; rink.height = height;
    rink.camera = new THREE.OrthographicCamera(-14, 14, 24, -24, 0.1, 150);
    frameRink(rink.camera, width, height, new Game());
    rink.ray = new THREE.Raycaster();
    rink.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.14);
    rink.goalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -NET_Z);
    for (const corner of GOAL_CORNERS) {
      const screen = rink.screenPoint(corner);
      assert.ok(screen.x > 0 && screen.x < width && screen.y > 0 && screen.y < height);
      assert.deepEqual(rink.aimPoint(screen.x, screen.y), { x: corner.x, z: corner.z, height: corner.height });
    }
    const ice = { x: 6, z: 4 };
    const screen = rink.screenPoint(ice);
    const aim = rink.aimPoint(screen.x, screen.y);
    assert.ok(Math.hypot(aim.x - ice.x, aim.z - ice.z) < 0.001);
    assert.equal(aim.height, undefined);
    const over = rink.screenPoint({ x: 0, z: NET_Z, height: NET_HEIGHT + 0.5 });
    assert.ok(rink.aimPoint(over.x, over.y).height > NET_HEIGHT);
  }
});

test('entire cage clears the HUD at every puck distance, including opening rush and camera impact', () => {
  const camera = new THREE.OrthographicCamera(-14, 14, 24, -24, 0.1, 150);
  for (const [width, height] of [[320, 240], [320, 420], [390, 500], [430, 680]]) {
    LEVELS.forEach((_, i) => {
      const game = new Game(i);
      for (const z of [20, 12, 4, -7, -11.5, -18]) for (const impact of [0, 1]) {
        game.puck = { x: 6, z }; game.impact = impact; game.motion = 0.31;
        frameRink(camera, width, height, game);
        for (const x of [-3.2, 3.2]) for (const netZ of [-20.1, NET_Z + 0.1]) for (const y of [0, NET_HEIGHT + 0.2]) {
          const p = new THREE.Vector3(x, y, netZ).project(camera);
          const pixelY = (1 - p.y) * height / 2;
          assert.ok(pixelY >= Math.min(48, height * 0.18) - 0.001, `Cage under HUD: ${width}x${height}, puck ${z}, y ${pixelY}`);
          assert.ok(pixelY < height - 20);
          assert.ok(Math.abs(p.x) < 1);
        }
        const puck = new THREE.Vector3(game.puck.x, 0.2, z).project(camera);
        assert.ok(Math.abs(puck.x) < 1 && Math.abs(puck.y) < 1);
      }
    });
  }
});

test('camera framing stays fixed while drawing a high shot', () => {
  const game = new Game();
  for (let i = 0; i < 100 && !game.paused; i++) game.update(1 / 60);
  const camera = new THREE.OrthographicCamera(-14, 14, 24, -24, 0.1, 150);
  frameRink(camera, 390, 500, game);
  const before = [...camera.projectionMatrix.elements, ...camera.matrixWorld.elements];
  game.aim([game.puck, GOAL_CORNERS[3]]);
  frameRink(camera, 390, 500, game);
  assert.deepEqual([...camera.projectionMatrix.elements, ...camera.matrixWorld.elements], before);
});

test('end boards remain visible and camera stays fixed during a bank preview', () => {
  const camera = new THREE.OrthographicCamera(-14, 14, 24, -24, 0.1, 150);
  for (const [width, height] of [[320, 240], [390, 500], [430, 680]]) {
    const game = new Game();
    for (let i = 0; i < 100 && !game.paused; i++) game.update(1 / 60);
    frameRink(camera, width, height, game);
    const before = [...camera.projectionMatrix.elements, ...camera.matrixWorld.elements];
    game.aim([game.puck, { x: 15.5, z: 4 }]); frameRink(camera, width, height, game);
    assert.deepEqual([...camera.projectionMatrix.elements, ...camera.matrixWorld.elements], before);
    for (const x of [-10.75, 10.75]) for (const z of [-22.5, 22.5]) {
      const p = new THREE.Vector3(x, 0.14, z).project(camera);
      assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1);
    }
  }
});
