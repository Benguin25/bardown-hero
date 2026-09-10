const { test } = require('node:test');
const assert = require('node:assert/strict');
const { WebGLRenderer } = require('three');

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
