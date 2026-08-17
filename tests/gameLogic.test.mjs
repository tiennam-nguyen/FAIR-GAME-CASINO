import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateRoundScore,
  calculateXiDachScores,
  derivePlayerBalances,
  simplifyDebts,
  getVietQRUrl,
} from '../src/lib/gameLogic.ts';

const baseConfig = {
  gameType: 'tien_len',
  baseBet: 10,
  rules: {
    mode: 'nhat_an_tat',
    price_nhat_bet: 50,
    price_nhi_ba: 20,
  },
};

test('Tiến Lên nhất ăn tất conserves money', () => {
  const scores = calculateRoundScore(baseConfig, [
    { playerId: 'A', rank: 1, penalties: 0 },
    { playerId: 'B', rank: 2, penalties: 0 },
    { playerId: 'C', rank: 3, penalties: 0 },
    { playerId: 'D', rank: 4, penalties: 0 },
  ]);

  assert.deepEqual(
    Object.fromEntries(scores.map((score) => [score.playerId, score.change])),
    { A: 30, B: -10, C: -10, D: -10 }
  );
  assert.equal(scores.reduce((sum, score) => sum + score.change, 0), 0);
});

test('Tiến Lên pair mode + penalties stays zero-sum and winner penalty is ignored', () => {
  const scores = calculateRoundScore(
    {
      ...baseConfig,
      rules: { ...baseConfig.rules, mode: 'nhat_bet_nhi_ba' },
    },
    [
      { playerId: 'A', rank: 1, penalties: 999 },
      { playerId: 'B', rank: 2, penalties: 0 },
      { playerId: 'C', rank: 3, penalties: 10 },
      { playerId: 'D', rank: 4, penalties: 5 },
    ]
  );

  const changes = Object.fromEntries(scores.map((score) => [score.playerId, score.change]));
  assert.deepEqual(changes, { A: 65, B: 20, C: -30, D: -55 });
  assert.equal(scores.reduce((sum, score) => sum + score.change, 0), 0);
});

test('Tiến Lên rejects duplicate ranks', () => {
  assert.throws(
    () =>
      calculateRoundScore(baseConfig, [
        { playerId: 'A', rank: 1, penalties: 0 },
        { playerId: 'B', rank: 1, penalties: 0 },
        { playerId: 'C', rank: 3, penalties: 0 },
        { playerId: 'D', rank: 4, penalties: 0 },
      ]),
    /Thứ hạng/
  );
});

test('Tiến Lên rejects partial players, duplicate identities, and invalid money inputs', () => {
  assert.throws(
    () => calculateRoundScore(baseConfig, [
      { playerId: 'A', rank: 1, penalties: 0 },
      { playerId: 'B', rank: 2, penalties: 0 },
    ]),
    /đúng 4 người/
  );
  assert.throws(
    () => calculateRoundScore(baseConfig, [
      { playerId: 'A', rank: 1, penalties: 0 },
      { playerId: 'A', rank: 2, penalties: 0 },
      { playerId: 'C', rank: 3, penalties: 0 },
      { playerId: 'D', rank: 4, penalties: 0 },
    ]),
    /bị trùng/
  );
  assert.throws(
    () => calculateRoundScore({ ...baseConfig, baseBet: -1 }, [
      { playerId: 'A', rank: 1, penalties: 0 },
      { playerId: 'B', rank: 2, penalties: 0 },
      { playerId: 'C', rank: 3, penalties: 0 },
      { playerId: 'D', rank: 4, penalties: 0 },
    ]),
    /Mức cược/
  );
});

test('Xì Dách derives dealer score automatically', () => {
  const scores = calculateXiDachScores('HOST', { B: 20, C: -10, D: 5 });
  const changes = Object.fromEntries(scores.map((score) => [score.playerId, score.change]));
  assert.deepEqual(changes, { HOST: -15, B: 20, C: -10, D: 5 });
  assert.equal(scores.reduce((sum, score) => sum + score.change, 0), 0);
});

test('Xì Dách rejects empty and non-integer player results', () => {
  assert.throws(() => calculateXiDachScores('HOST', { HOST: 0 }), /ít nhất một/);
  assert.throws(() => calculateXiDachScores('HOST', { B: 1.5 }), /số nguyên/);
  assert.throws(() => calculateXiDachScores('HOST', { B: Number.NaN }), /số nguyên/);
});

test('debt simplification preserves balanced obligations', () => {
  const result = simplifyDebts([
    { id: 'A', name: 'A', score: -50 },
    { id: 'B', name: 'B', score: 10 },
    { id: 'C', name: 'C', score: 40 },
  ]);

  assert.equal(result.isBalanced, true);
  assert.equal(result.imbalance, 0);
  assert.equal(result.transactions.reduce((sum, item) => sum + item.amount, 0), 50);
  assert.equal(result.transactions.every((item) => item.amount > 0), true);
});

test('debt simplification refuses an imbalanced ledger', () => {
  const result = simplifyDebts([
    { id: 'A', name: 'A', score: -50 },
    { id: 'B', name: 'B', score: 40 },
  ]);

  assert.equal(result.isBalanced, false);
  assert.equal(result.transactions.length, 0);
  assert.equal(result.imbalance, -10);
});

test('debt simplification handles empty, zero, and malformed balances', () => {
  assert.deepEqual(simplifyDebts([]).transactions, []);
  assert.equal(simplifyDebts([{ id: 'A', name: 'A', score: 0 }]).isBalanced, true);
  const malformed = simplifyDebts([{ id: 'A', name: 'A', score: Number.NaN }]);
  assert.equal(malformed.isBalanced, false);
  assert.equal(malformed.transactions.length, 0);
});

test('VietQR URL rounds amount to VND and rejects empty payment data', () => {
  const url = getVietQRUrl('VCB', '123 456', 12, 'SONG PHANG');
  assert.match(url, /VCB-123456-compact\.png/);
  assert.match(url, /amount=12000/);
  assert.equal(getVietQRUrl('', '123', 10, 'x'), '');
  assert.equal(getVietQRUrl('VCB', '123', 0, 'x'), '');
  assert.equal(getVietQRUrl('VCB', '123', -10, 'x'), '');
  assert.match(getVietQRUrl('VCB', '123', 1.2346, 'A & B'), /amount=1235&addInfo=A%20%26%20B/);
});


test('ledger transactions are the source of truth for player balances', () => {
  const players = [
    { uid: 'a', displayName: 'A', bankInfo: {}, currentScore: 999, isOnline: true, joinedAt: 1 },
    { uid: 'b', displayName: 'B', bankInfo: {}, currentScore: -999, isOnline: true, joinedAt: 2 },
  ];
  const transactions = [
    { id: 't1', roundNumber: 1, timestamp: 1, gameType: 'xi_dach', createdBy: 'a', scores: [
      { playerId: 'a', change: 20 },
      { playerId: 'b', change: -20 },
    ] },
    { id: 't2', roundNumber: 2, timestamp: 2, gameType: 'xi_dach', createdBy: 'a', scores: [
      { playerId: 'a', change: -5 },
      { playerId: 'b', change: 5 },
    ] },
  ];

  const derived = derivePlayerBalances(players, transactions);
  assert.equal(derived.find((player) => player.uid === 'a').currentScore, 15);
  assert.equal(derived.find((player) => player.uid === 'b').currentScore, -15);
});

test('ledger reload derivation resets legacy balances and ignores unknown players', () => {
  const players = [
    { uid: 'a', displayName: 'A', bankInfo: {}, currentScore: 999, isOnline: true, joinedAt: 1 },
    { uid: 'b', displayName: 'B', bankInfo: {}, currentScore: -999, isOnline: true, joinedAt: 2 },
  ];
  assert.deepEqual(derivePlayerBalances(players, []).map((player) => player.currentScore), [0, 0]);
  const derived = derivePlayerBalances(players, [{
    id: 't1', roundNumber: 1, timestamp: 1, gameType: 'xi_dach', createdBy: 'a', scores: [
      { playerId: 'a', change: 5 },
      { playerId: 'unknown', change: -5 },
    ],
  }]);
  assert.deepEqual(derived.map((player) => player.currentScore), [5, 0]);
});
