const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync(require.resolve('../src/audioEvents.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleForTest = { exports: {} };
new Function('exports', 'module', js)(moduleForTest.exports, moduleForTest);
const { drainSoundEvents } = moduleForTest.exports;

test('drains every new cue in order, including same-frame save and fail', () => {
  const events = [
    { id: 4, event: 'save' }, { id: 5, event: 'fail' }, { id: 6, event: 'freeze' },
  ];
  assert.deepEqual(drainSoundEvents(events, 3), { cues: ['save', 'fail'], lastId: 6 });
});

test('does not replay already-consumed events', () => {
  const events = [{ id: 1, event: 'release' }, { id: 2, event: 'bank' }];
  assert.deepEqual(drainSoundEvents(events, 2), { cues: [], lastId: 2 });
});
