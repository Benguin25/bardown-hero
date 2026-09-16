const test = require('node:test');
const assert = require('node:assert/strict');
const { validateLevels } = require('../.test-build/content/types.js');
const { LEVELS, CHAPTERS, CHAPTER_LEVEL_COUNTS, HIGHLIGHTS } = require('../.test-build/content/levels.js');
const { LEVEL_IDS, levelId, levelIndex } = require('../.test-build/content/index.js');

const moment = { title: 'm', instruction: 'i', carrier: { x: 0, z: 0 }, support: [{ x: 1, z: 1 }, { x: -1, z: 1 }], defense: [{ x: 1, z: 2 }, { x: -1, z: 2 }] };
test('content validation accepts a well-formed level', () => {
  assert.deepEqual(validateLevels([{ id: 'level-01', title: 'A', moments: [moment], objectives: ['goal', 'passes', 'top'] }]), []);
});
test('content validation catches malformed formations, objectives and powerups', () => {
  const errors = validateLevels([{ id: 'bad', title: 'A', moments: [{ ...moment, support: [], powerup: 'zap' }], objectives: ['nope'] }]);
  assert.ok(errors.some((e) => e.includes('formation')));
  assert.ok(errors.some((e) => e.includes('objective')));
  assert.ok(errors.some((e) => e.includes('powerup')));
});

test('the authored campaign is valid and stable ids map to existing indexes', () => {
  assert.deepEqual(validateLevels(LEVELS), []);
  assert.equal(LEVELS.length, 32);
  assert.equal(CHAPTERS.length, 6);
  assert.deepEqual(CHAPTER_LEVEL_COUNTS, [4, 4, 4, 4, 8, 8]);
  assert.equal(CHAPTER_LEVEL_COUNTS.reduce((sum, count) => sum + count, 0), LEVELS.length);
  assert.equal(HIGHLIGHTS.length, LEVELS.length);
  assert.equal(new Set(LEVELS.map(level => level.title)).size, LEVELS.length);
  assert.equal(new Set(LEVELS.slice(16).map(level => level.moments.map(moment => moment.title).join('|'))).size, 16);
  assert.equal(LEVELS.length * 3, 96);
  assert.deepEqual(LEVEL_IDS, LEVELS.map(level => level.id));
  LEVELS.forEach((level, index) => {
    assert.equal(levelId(index), level.id);
    assert.equal(levelIndex(level.id), index);
  });
});

test('the shipped first 16 stable ids remain index-compatible', () => {
  assert.deepEqual(LEVELS.slice(0, 16).map(level => level.id), Array.from({ length: 16 }, (_, i) => `level-${String(i + 1).padStart(2, '0')}`));
  assert.deepEqual(LEVELS.slice(16).map(level => level.id), Array.from({ length: 16 }, (_, i) => `level-${i + 17}`));
});
