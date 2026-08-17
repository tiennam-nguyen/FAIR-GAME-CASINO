import test from 'node:test';
import assert from 'node:assert/strict';

import { getAutomaticSeason, resolveSeason } from '../src/lib/season.ts';

test('automatic season follows month boundaries', () => {
  assert.equal(getAutomaticSeason(new Date(2026, 0, 1)), 'winter');
  assert.equal(getAutomaticSeason(new Date(2026, 1, 1)), 'spring');
  assert.equal(getAutomaticSeason(new Date(2026, 3, 1)), 'spring');
  assert.equal(getAutomaticSeason(new Date(2026, 4, 1)), 'summer');
  assert.equal(getAutomaticSeason(new Date(2026, 6, 1)), 'summer');
  assert.equal(getAutomaticSeason(new Date(2026, 7, 1)), 'autumn');
  assert.equal(getAutomaticSeason(new Date(2026, 9, 1)), 'autumn');
  assert.equal(getAutomaticSeason(new Date(2026, 10, 1)), 'winter');
  assert.equal(getAutomaticSeason(new Date(2026, 11, 1)), 'winter');
});

test('manual season preference overrides automatic mode', () => {
  assert.equal(resolveSeason('summer', new Date(2026, 0, 1)), 'summer');
  assert.equal(resolveSeason('spring', new Date(2026, 7, 1)), 'spring');
});
