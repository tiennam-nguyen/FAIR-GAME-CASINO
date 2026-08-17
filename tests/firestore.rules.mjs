import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

const PROJECT_ID = 'demo-song-phang';
const ROOM_ID = 'ROOM1';
const HOST = 'host';
const MEMBER = 'member';
const OUTSIDER = 'outsider';

let testEnv;

function room(overrides = {}) {
  return {
    hostId: HOST,
    status: 'active',
    createdAt: 1,
    gameConfig: {
      gameType: 'xi_dach',
      baseBet: 10,
      rules: { mode: 'nhat_an_tat', price_nhat_bet: 10, price_nhi_ba: 10 },
    },
    metadata: { totalRounds: 0, playerCount: 2, lastUpdated: 1 },
    ...overrides,
  };
}

function player(uid, overrides = {}) {
  return {
    uid,
    displayName: uid,
    bankInfo: { bankId: '', bankName: '', accountNo: '', accountName: '' },
    currentScore: 0,
    isOnline: true,
    joinedAt: 1,
    lastActive: 1,
    ...overrides,
  };
}

function transaction(roundNumber = 1, overrides = {}) {
  return {
    roundNumber,
    timestamp: 2,
    gameType: 'xi_dach',
    scores: [
      { playerId: HOST, change: 10 },
      { playerId: MEMBER, change: -10 },
    ],
    createdBy: HOST,
    ...overrides,
  };
}

function dbFor(uid) {
  return uid
    ? testEnv.authenticatedContext(uid, { provider_id: 'anonymous' }).firestore()
    : testEnv.unauthenticatedContext().firestore();
}

async function seedRoom({ roomData = room(), players = [HOST, MEMBER] } = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`rooms/${ROOM_ID}`).set(roomData);
    await Promise.all(
      players.map((uid) => db.doc(`rooms/${ROOM_ID}/players/${uid}`).set(player(uid)))
    );
  });
}

async function atomicJoin(uid) {
  const db = dbFor(uid);
  const roomRef = db.doc(`rooms/${ROOM_ID}`);
  const playerRef = db.doc(`rooms/${ROOM_ID}/players/${uid}`);
  return db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    const count = roomSnap.data().metadata.playerCount;
    tx.set(playerRef, player(uid));
    tx.update(roomRef, {
      'metadata.playerCount': count + 1,
      'metadata.lastUpdated': Date.now(),
    });
  });
}

async function appendRound(id, roundNumber, scores) {
  const db = dbFor(HOST);
  const batch = db.batch();
  batch.update(db.doc(`rooms/${ROOM_ID}`), {
    'metadata.totalRounds': roundNumber,
    'metadata.lastUpdated': Date.now(),
  });
  batch.set(
    db.doc(`rooms/${ROOM_ID}/transactions/${id}`),
    transaction(roundNumber, scores ? { scores } : {})
  );
  return batch.commit();
}

before(async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules } });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

test('room lookup requires authentication and room enumeration is denied', async () => {
  await seedRoom();
  await assertFails(dbFor(null).doc(`rooms/${ROOM_ID}`).get());
  await assertSucceeds(dbFor(OUTSIDER).doc(`rooms/${ROOM_ID}`).get());
  await assertFails(dbFor(OUTSIDER).collection('rooms').get());
});

test('outsiders and members cannot mutate host room controls', async () => {
  await seedRoom();
  await assertFails(dbFor(OUTSIDER).doc(`rooms/${ROOM_ID}`).update({ status: 'closed' }));
  await assertFails(dbFor(MEMBER).doc(`rooms/${ROOM_ID}`).update({ status: 'closed' }));
});

test('host may make intended status updates but cannot inject fields or invalid status', async () => {
  await seedRoom();
  const ref = dbFor(HOST).doc(`rooms/${ROOM_ID}`);
  await assertSucceeds(ref.update({ status: 'settling', 'metadata.lastUpdated': 2 }));
  await assertFails(ref.update({ admin: true }));
  await assertFails(ref.update({ status: 'anything' }));
});

test('room creation rejects unexpected fields and invalid shape', async () => {
  const hostDb = dbFor(HOST);
  await assertFails(hostDb.doc('rooms/BAD01').set(room({ injected: true })));
  await assertFails(hostDb.doc('rooms/BAD02').set(room({ status: 'active', metadata: { totalRounds: 0, playerCount: 1 } })));
});

test('room and host player can be created atomically with the intended schema', async () => {
  const hostDb = dbFor(HOST);
  await assertFails(
    hostDb.doc('rooms/ALONE').set(
      room({ metadata: { totalRounds: 0, playerCount: 1, lastUpdated: 1 } })
    )
  );
  const batch = hostDb.batch();
  batch.set(hostDb.doc('rooms/NEW01'), room({ metadata: { totalRounds: 0, playerCount: 1, lastUpdated: 1 } }));
  batch.set(hostDb.doc(`rooms/NEW01/players/${HOST}`), player(HOST));
  await assertSucceeds(batch.commit());
});

test('pre-join user can read only their own player document and cannot enumerate players', async () => {
  await seedRoom();
  const outsiderDb = dbFor(OUTSIDER);
  await assertSucceeds(outsiderDb.doc(`rooms/${ROOM_ID}/players/${OUTSIDER}`).get());
  await assertFails(outsiderDb.doc(`rooms/${ROOM_ID}/players/${HOST}`).get());
  await assertFails(outsiderDb.collection(`rooms/${ROOM_ID}/players`).get());
  await assertSucceeds(dbFor(MEMBER).collection(`rooms/${ROOM_ID}/players`).get());
});

test('join is atomic, identity-bound, capped at four, and blocked when closed', async () => {
  await seedRoom();
  await assertSucceeds(atomicJoin(OUTSIDER));
  await assertFails(
    dbFor(OUTSIDER).doc(`rooms/${ROOM_ID}/players/someone-else`).set(player('someone-else'))
  );

  await testEnv.clearFirestore();
  await seedRoom({ roomData: room({ metadata: { totalRounds: 0, playerCount: 4, lastUpdated: 1 } }), players: [HOST, MEMBER, 'p3', 'p4'] });
  await assertFails(atomicJoin(OUTSIDER));

  await testEnv.clearFirestore();
  await seedRoom({ roomData: room({ status: 'closed' }) });
  await assertFails(atomicJoin(OUTSIDER));
});

test('simultaneous joins at 3/4 capacity admit exactly one client', async () => {
  await seedRoom({ roomData: room({ metadata: { totalRounds: 0, playerCount: 3, lastUpdated: 1 } }), players: [HOST, MEMBER, 'p3'] });
  const results = await Promise.allSettled([atomicJoin('join-a'), atomicJoin('join-b')]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const snapshot = await dbFor(HOST).doc(`rooms/${ROOM_ID}`).get();
  assert.equal(snapshot.data().metadata.playerCount, 4);
});

test('players cannot overwrite identity, balances, other players, or inject fields', async () => {
  await seedRoom();
  const memberDb = dbFor(MEMBER);
  const ownRef = memberDb.doc(`rooms/${ROOM_ID}/players/${MEMBER}`);
  await assertSucceeds(ownRef.update({ displayName: 'Member 2', lastActive: 2 }));
  await assertFails(ownRef.update({ currentScore: 999 }));
  await assertFails(ownRef.update({ injected: true }));
  await assertFails(memberDb.doc(`rooms/${ROOM_ID}/players/${HOST}`).update({ displayName: 'hijacked' }));
  await assertFails(ownRef.delete());
});

test('only host can append a valid zero-sum round with the atomic counter update', async () => {
  await seedRoom();
  await assertSucceeds(appendRound('round-1', 1));

  await testEnv.clearFirestore();
  await seedRoom();
  const memberDb = dbFor(MEMBER);
  await assertFails(memberDb.doc(`rooms/${ROOM_ID}/transactions/bad`).set(transaction()));
  await assertFails(dbFor(HOST).doc(`rooms/${ROOM_ID}/transactions/no-counter`).set(transaction()));
  await assertFails(appendRound('imbalanced', 1, [
    { playerId: HOST, change: 10 },
    { playerId: MEMBER, change: -9 },
  ]));
});

test('ledger rejects malformed documents, unexpected fields, update, and non-latest delete', async () => {
  await seedRoom();
  const hostDb = dbFor(HOST);
  const roomRef = hostDb.doc(`rooms/${ROOM_ID}`);
  const malformedBatch = hostDb.batch();
  malformedBatch.update(roomRef, { 'metadata.totalRounds': 1 });
  malformedBatch.set(
    hostDb.doc(`rooms/${ROOM_ID}/transactions/malformed`),
    transaction(1, { injected: true })
  );
  await assertFails(malformedBatch.commit());

  await assertSucceeds(appendRound('round-1', 1));
  await assertSucceeds(appendRound('round-2', 2));
  await assertFails(hostDb.doc(`rooms/${ROOM_ID}/transactions/round-2`).update({ timestamp: 9 }));

  const undoOld = hostDb.batch();
  undoOld.delete(hostDb.doc(`rooms/${ROOM_ID}/transactions/round-1`));
  undoOld.update(roomRef, { 'metadata.totalRounds': 1 });
  await assertFails(undoOld.commit());
});

test('latest-only undo atomically rewinds once and post-close writes are denied', async () => {
  await seedRoom();
  await assertSucceeds(appendRound('round-1', 1));
  const hostDb = dbFor(HOST);
  const undo = hostDb.batch();
  undo.delete(hostDb.doc(`rooms/${ROOM_ID}/transactions/round-1`));
  undo.update(hostDb.doc(`rooms/${ROOM_ID}`), {
    'metadata.totalRounds': 0,
    'metadata.lastUpdated': 3,
  });
  await assertSucceeds(undo.commit());
  const repeatedUndo = hostDb.batch();
  repeatedUndo.delete(hostDb.doc(`rooms/${ROOM_ID}/transactions/round-1`));
  repeatedUndo.update(hostDb.doc(`rooms/${ROOM_ID}`), {
    'metadata.totalRounds': 0,
    'metadata.lastUpdated': 4,
  });
  await assertFails(repeatedUndo.commit());

  await assertSucceeds(hostDb.doc(`rooms/${ROOM_ID}`).update({ status: 'settling' }));
  await assertSucceeds(hostDb.doc(`rooms/${ROOM_ID}`).update({ status: 'closed' }));
  await assertFails(appendRound('after-close', 1));
});
