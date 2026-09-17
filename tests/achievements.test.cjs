const test = require('node:test');
const assert = require('node:assert/strict');
const a = require('../.test-build/achievements.js');

const progress = (count, value = [true, true, true]) => ({ version: 1, runs: Object.fromEntries(Array.from({ length: count }, (_, i) => [String(i), [...value]])) });
const event = (index = 0, facts = {}) => ({ type: 'run_completed', levelIndex: index, run: [true, true, true], facts });
const observe = (state, ev, p) => a.observeAchievementEvent(state, ev, p);

test('core gameplay facts unlock and simultaneous rewards', () => {
  const r = observe(a.emptyAchievements(), event(0, { goalHeight: 4, actionPower: 'curve', curvedActions: 1, retry: false }), progress(1));
  assert.ok(r.unlocked.some(x => x.id === 'bar-down'));
  assert.ok(r.unlocked.some(x => x.id === 'mega-curve'));
  assert.ok(r.unlocked.some(x => x.id === 'no-retry'));
  assert.equal(a.ACHIEVEMENTS.find(x => x.id === 'bar-down').cosmeticReward, 'gold');
  assert.equal(a.ACHIEVEMENTS.find(x => x.id === 'no-retry').cosmeticReward, 'carbon');
});

test('duplicate event does not duplicate unlocks or cumulative stats', () => {
  const p = progress(1); const first = observe(a.emptyAchievements(), event(0, { passes: 2 }), p);
  const second = observe(first.state, event(0, { passes: 2 }), p);
  assert.equal(second.unlocked.length, 0);
  assert.equal(second.state.stats.runs, 2);
  assert.equal(second.state.stats.passes, 4);
});

test('tolerant persistence and star thresholds', () => {
  const parsed = a.parseAchievements('{"version":1,"completed":{"first-goal":123},"stats":{"goals":9}}');
  assert.equal(a.isAchievementComplete(parsed, 'first-goal'), true);
  assert.equal(a.parseAchievements('not json').stats.goals, 0);
  let r = observe(a.emptyAchievements(), event(0), progress(30));
  assert.ok(r.unlocked.some(x => x.id === 'thirty-stars'));
  r = observe(a.emptyAchievements(), event(0), progress(32));
  assert.ok(r.unlocked.some(x => x.id === 'sixty-stars'));
  r = observe(a.emptyAchievements(), event(0), progress(32, [true, true, true]));
  assert.ok(r.unlocked.some(x => x.id === 'ninety-stars'));
});

test('chapter and campaign progression, with highlight route required', () => {
  let r = observe(a.emptyAchievements(), event(24, { highlightRoute: false }), progress(24));
  assert.equal(r.unlocked.some(x => x.id === 'late-perfect'), false);
  r = observe(a.emptyAchievements(), event(24, { highlightRoute: true }), progress(25));
  assert.equal(r.unlocked.some(x => x.id === 'late-perfect'), true);
  assert.equal(observe(a.emptyAchievements(), event(3), progress(4)).unlocked.some(x => x.id === 'chapter-complete'), true);
  assert.equal(observe(a.emptyAchievements(), event(31), progress(32)).unlocked.some(x => x.id === 'campaign-complete'), true);
});
