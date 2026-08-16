import test from 'node:test';
import assert from 'node:assert/strict';

import { getAutomaticSeason, resolveSeason } from '../src/lib/season.ts';

test('automatic season follows month boundaries', () => {
  assert.equal(getAutomaticSeason(new Date(2026, 2, 1)), 'spring');
  assert.equal(getAutomaticSeason(new Date(2026, 5, 1)), 'summer');
  assert.equal(getAutomaticSeason(new Date(2026, 8, 1)), 'autumn');
  assert.equal(getAutomaticSeason(new Date(2026, 11, 1)), 'winter');
  assert.equal(getAutomaticSeason(new Date(2026, 0, 1)), 'winter');
});

test('manual season preference overrides automatic mode', () => {
  assert.equal(resolveSeason('summer', new Date(2026, 0, 1)), 'summer');
});
