const { test } = require('node:test');
const assert = require('node:assert/strict');
const { WebGLRenderer } = require('three');
const THREE = require('three');
const { Rink, frameRink, dampAngle, approachPoint } = require('../.test-build/rink.js');
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

test('phone-sized near-corner aim snaps to the authored target without pulling the middle of the net', () => {
  const rink = Object.create(Rink.prototype);
  rink.width = 390; rink.height = 600;
  rink.camera = new THREE.OrthographicCamera(-14, 14, 24, -24, 0.1, 150);
  frameRink(rink.camera, rink.width, rink.height, new Game());
  rink.ray = new THREE.Raycaster();
  rink.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.14);
  rink.goalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -NET_Z);
  for (const corner of GOAL_CORNERS) {
    const near = rink.screenPoint({ x: corner.x + (corner.x < 0 ? 0.85 : -0.85), z: NET_Z, height: corner.height + 0.7 });
    assert.deepEqual(rink.aimPoint(near.x, near.y), { x: corner.x, z: corner.z, height: corner.height });
  }
  const middle = rink.screenPoint({ x: 0, z: NET_Z, height: NET_HEIGHT / 2 });
  const aim = rink.aimPoint(middle.x, middle.y);
  assert.ok(Math.abs(aim.x) < 0.001 && Math.abs(aim.height - NET_HEIGHT / 2) < 0.001);
});

test('wide and over-the-bar face aims stay outside every corner capture area', () => {
  for (const [width, height] of [[320, 420], [390, 600], [430, 680]]) {
    const rink = Object.create(Rink.prototype);
    rink.width = width; rink.height = height;
    rink.camera = new THREE.OrthographicCamera(-14, 14, 24, -24, 0.1, 150);
    frameRink(rink.camera, width, height, new Game());
    rink.ray = new THREE.Raycaster();
    rink.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.14);
    rink.goalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -NET_Z);
    const wide = rink.screenPoint({ x: 3.35, z: NET_Z, height: 3.5 });
    const wideAim = rink.aimPoint(wide.x, wide.y);
    assert.ok(wideAim.x > 3.2, `${width}x${height}: wide aim was corrected inside the post`);
    const high = rink.screenPoint({ x: 2.25, z: NET_Z, height: 4.55 });
    const highAim = rink.aimPoint(high.x, high.y);
    assert.ok(highAim.height > NET_HEIGHT, `${width}x${height}: over-bar aim was corrected to a corner`);
  }
});

test('skater heading damping is frame-rate independent and takes the short turn across the angle seam', () => {
  let thirty = 3.05, sixty = 3.05;
  for (let i = 0; i < 15; i++) thirty = dampAngle(thirty, -3.05, 1 / 30);
  for (let i = 0; i < 30; i++) sixty = dampAngle(sixty, -3.05, 1 / 60);
  assert.ok(Math.abs(thirty - sixty) < 1e-10);
  assert.ok(thirty > 3.05, 'crosses the seam by the short positive turn');
});

test('rendered skaters approach simulation positions at a bounded speed', () => {
  const target = { x: 12, z: -8 };
  for (const dt of [1 / 120, 1 / 60, 0.05]) {
    let p = { x: 0, z: 0 };
    for (let elapsed = 0; elapsed < 0.5 - 0.000001; elapsed += dt) {
      const before = p;
      p = approachPoint(p, target, 7.8, dt);
      assert.ok(Math.hypot(p.x - before.x, p.z - before.z) <= 7.8 * dt + 1e-9);
    }
    assert.ok(Math.abs(Math.hypot(p.x, p.z) - 3.9) <= 7.8 * dt + 1e-9);
  }
});

test('entire cage clears the compact rink margin at every puck distance and camera impact', () => {
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
          assert.ok(pixelY >= Math.min(16, height * 0.06) - 0.001, `Cage clipped: ${width}x${height}, puck ${z}, y ${pixelY}`);
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
