const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LEVELS } = require('../.test-build/content/levels.js');
const { emptyProgress, isUnlocked, recordRun } = require('../.test-build/progress.js');
const { VENUES, TOTAL_STARS, currentLevel, isPlayable, isVenueOpen, sealedVenue, totalStars, venueOfLevel, venueStars } = require('../.test-build/venues.js');

const clear = (progress, index, stars) => recordRun(progress, index, [true, stars > 1, stars > 2]);

test('venues cover every level exactly once and total the advertised stars', () => {
  assert.equal(VENUES.length, 6);
  assert.equal(TOTAL_STARS, LEVELS.length * 3);
  assert.equal(VENUES.reduce((sum, venue) => sum + venue.count, 0), LEVELS.length);
  let expected = 0;
  for (const venue of VENUES) { assert.equal(venue.start, expected); expected += venue.count; }
  for (let i = 0; i < LEVELS.length; i++) {
    const venue = venueOfLevel(i);
    assert.ok(i >= venue.start && i < venue.start + venue.count);
  }
});

test('every gate stays reachable: it never exceeds the stars available before it', () => {
  VENUES.forEach((venue, order) => {
    if (order === 0) { assert.equal(venue.gateStars, 0); return; }
    const available = VENUES.slice(0, order).reduce((sum, earlier) => sum + earlier.count * 3, 0);
    assert.ok(venue.gateStars <= available, `venue ${order} gate ${venue.gateStars} exceeds ${available}`);
    assert.ok(venue.gateStars > VENUES[order - 1].gateStars, `venue ${order} gate does not rise`);
  });
});

test('a sealed venue blocks play without touching the sequential unlock rule', () => {
  let progress = emptyProgress();
  const venue = VENUES[1];
  for (let i = 0; i < venue.start; i++) progress = clear(progress, i, 1);
  // Every level before the gate is finished, so the next index unlocks in order.
  assert.ok(isUnlocked(progress, venue.start));
  assert.ok(!isVenueOpen(progress, venue), 'a one-star run through venue 01 should not break the gate');
  assert.ok(!isPlayable(progress, venue.start));
  assert.equal(sealedVenue(progress).id, venue.id);
  // Replaying earlier levels for stars is always enough to open it.
  for (let i = 0; i < venue.start; i++) progress = clear(progress, i, 3);
  assert.ok(isVenueOpen(progress, venue));
  assert.ok(isPlayable(progress, venue.start));
  // A perfect venue 01 is worth 12 stars, which already clears venue 03's gate;
  // the next thing still sealed is venue 04.
  assert.equal(sealedVenue(progress).id, VENUES[3].id);
  // Sequential unlocking still holds: an open venue is not an entered venue.
  assert.ok(!isPlayable(progress, VENUES[2].start));
});

test('the map focuses the first unfinished level the player can actually enter', () => {
  let progress = emptyProgress();
  assert.equal(currentLevel(progress), 0);
  progress = clear(progress, 0, 3);
  assert.equal(currentLevel(progress), 1);
  for (let i = 1; i < VENUES[1].start; i++) progress = clear(progress, i, 3);
  assert.equal(totalStars(progress), VENUES[1].start * 3);
  assert.equal(venueStars(progress, VENUES[0]), VENUES[0].count * 3);
  assert.equal(currentLevel(progress), VENUES[1].start);
});
