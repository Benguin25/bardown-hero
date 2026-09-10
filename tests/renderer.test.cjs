const { test } = require('node:test');
const assert = require('node:assert/strict');
const { WebGLRenderer } = require('three');
const THREE = require('three');
const { Rink } = require('../.test-build/rink.js');
const { GOAL_CORNERS, NET_Z, NET_HEIGHT } = require('../.test-build/game.js');

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
    const halfWidth = Math.max(11.8, 18 * width / height);
    rink.camera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfWidth * height / width, -halfWidth * height / width, 0.1, 150);
    rink.camera.position.set(0, 37, 22);
    rink.camera.lookAt(0, 0, -4);
    rink.camera.updateProjectionMatrix(); rink.camera.updateMatrixWorld();
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
