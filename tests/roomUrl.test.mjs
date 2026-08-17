import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRoomUrl, normalizeRoomId, readRoomLocation } from '../src/lib/roomUrl.ts';

test('room URL accepts canonical and lowercase room codes', () => {
  assert.equal(normalizeRoomId(' ab2cd '), 'AB2CD');
  assert.deepEqual(readRoomLocation('?room=ab2cd'), { kind: 'valid', roomId: 'AB2CD' });
});

test('room URL rejects malformed or ambiguous codes', () => {
  assert.equal(normalizeRoomId('ABCD'), null);
  assert.equal(normalizeRoomId('ABI23'), null);
  assert.equal(normalizeRoomId('AB0CD'), null);
  assert.deepEqual(readRoomLocation('?room=bad'), { kind: 'invalid', raw: 'bad' });
});

test('room URL distinguishes absent room from an explicit invalid room', () => {
  assert.deepEqual(readRoomLocation('?season=autumn'), { kind: 'absent' });
  assert.deepEqual(readRoomLocation('?room='), { kind: 'invalid', raw: '' });
});

test('room URL preserves unrelated query and hash when adding or clearing room', () => {
  assert.equal(
    buildRoomUrl('https://example.test/play?season=autumn#score', 'ab2cd'),
    '/play?season=autumn&room=AB2CD#score'
  );
  assert.equal(
    buildRoomUrl('https://example.test/play?room=AB2CD&season=autumn#score', null),
    '/play?season=autumn#score'
  );
});
