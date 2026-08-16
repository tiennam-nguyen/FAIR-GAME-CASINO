import type {
  GameConfig,
  PlayerResult,
  RoundScore,
  UserScore,
  TransactionInstruction,
  SettlementResult,
  Player,
  Transaction,
} from '../types/index.ts';

const EPSILON = 0.01;

function assertFiniteNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} không hợp lệ.`);
  }
}

export function calculateRoundScore(
  config: GameConfig,
  results: PlayerResult[]
): RoundScore[] {
  if (results.length !== 4) {
    throw new Error('Tiến Lên cần đúng 4 người chơi để chốt một ván.');
  }

  const ids = results.map((result) => result.playerId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Danh sách người chơi bị trùng.');
  }

  const ranks = results.map((result) => result.rank);
  if (new Set(ranks).size !== 4 || ![1, 2, 3, 4].every((rank) => ranks.includes(rank as 1 | 2 | 3 | 4))) {
    throw new Error('Thứ hạng phải gồm đủ Nhất, Nhì, Ba và Bét.');
  }

  assertFiniteNonNegative(config.baseBet, 'Mức cược');
  assertFiniteNonNegative(config.rules.price_nhat_bet, 'Mức Nhất ăn Bét');
  assertFiniteNonNegative(config.rules.price_nhi_ba, 'Mức Nhì ăn Ba');

  const scoreChanges: Record<string, number> = {};
  const notes: Record<string, string[]> = {};

  results.forEach((player) => {
    assertFiniteNonNegative(player.penalties, 'Tiền phạt');
    scoreChanges[player.playerId] = 0;
    notes[player.playerId] = [];
  });

  const winner = results.find((result) => result.rank === 1)!;

  if (config.rules.mode === 'nhat_bet_nhi_ba') {
    const runnerUp = results.find((result) => result.rank === 2)!;
    const third = results.find((result) => result.rank === 3)!;
    const last = results.find((result) => result.rank === 4)!;

    scoreChanges[winner.playerId] += config.rules.price_nhat_bet;
    scoreChanges[last.playerId] -= config.rules.price_nhat_bet;
    notes[winner.playerId].push(`Nhất ăn Bét +${config.rules.price_nhat_bet}k`);
    notes[last.playerId].push(`Bét trả Nhất -${config.rules.price_nhat_bet}k`);

    scoreChanges[runnerUp.playerId] += config.rules.price_nhi_ba;
    scoreChanges[third.playerId] -= config.rules.price_nhi_ba;
    notes[runnerUp.playerId].push(`Nhì ăn Ba +${config.rules.price_nhi_ba}k`);
    notes[third.playerId].push(`Ba trả Nhì -${config.rules.price_nhi_ba}k`);
  } else {
    results.forEach((player) => {
      if (player.playerId === winner.playerId) return;
      scoreChanges[player.playerId] -= config.baseBet;
      scoreChanges[winner.playerId] += config.baseBet;
      notes[player.playerId].push(`Trả Nhất -${config.baseBet}k`);
    });
    notes[winner.playerId].push(`Nhất ăn tất +${(results.length - 1) * config.baseBet}k`);
  }

  // Penalties are paid to the winner. A winner cannot meaningfully penalize themself.
  results.forEach((player) => {
    if (player.playerId === winner.playerId || player.penalties <= 0) return;
    scoreChanges[player.playerId] -= player.penalties;
    scoreChanges[winner.playerId] += player.penalties;
    notes[player.playerId].push(`Phạt -${player.penalties}k`);
    notes[winner.playerId].push(`Ăn phạt +${player.penalties}k`);
  });

  const scores = Object.entries(scoreChanges).map(([playerId, change]) => ({
    playerId,
    change,
    note: notes[playerId].join(' · '),
  }));

  const total = scores.reduce((sum, score) => sum + score.change, 0);
  if (Math.abs(total) > EPSILON) {
    throw new Error(`Lỗi bảo toàn tiền: ván đang lệch ${total}k.`);
  }

  return scores;
}


export function derivePlayerBalances(players: Player[], transactions: Transaction[]): Player[] {
  const balances = new Map(players.map((player) => [player.uid, 0]));

  transactions.forEach((transaction) => {
    transaction.scores.forEach((score) => {
      if (!balances.has(score.playerId)) return;
      balances.set(score.playerId, (balances.get(score.playerId) ?? 0) + score.change);
    });
  });

  return players.map((player) => ({
    ...player,
    currentScore: balances.get(player.uid) ?? 0,
  }));
}

export function simplifyDebts(users: UserScore[]): SettlementResult {
  const transactions: TransactionInstruction[] = [];
  const logs: string[] = [];
  const sum = users.reduce((acc, current) => acc + current.score, 0);
  const imbalance = Math.round(sum * 100) / 100;

  if (!users.every((user) => Number.isFinite(user.score))) {
    return {
      transactions: [],
      logs: ['Không thể cấn nợ vì có số dư không hợp lệ.'],
      isBalanced: false,
      imbalance: Number.NaN,
    };
  }

  if (Math.abs(imbalance) > EPSILON) {
    return {
      transactions: [],
      logs: [`Tổng số dư đang lệch ${imbalance}k. Hãy hoàn tác ván sai trước khi thanh toán.`],
      isBalanced: false,
      imbalance,
    };
  }

  const debtors = users
    .filter((user) => user.score < -EPSILON)
    .map((user) => ({ ...user }))
    .sort((a, b) => a.score - b.score);

  const creditors = users
    .filter((user) => user.score > EPSILON)
    .map((user) => ({ ...user }))
    .sort((a, b) => b.score - a.score);

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.round(Math.min(Math.abs(debtor.score), creditor.score) * 100) / 100;

    if (amount > EPSILON) {
      transactions.push({
        fromUser: debtor.id,
        fromName: debtor.name,
        toUser: creditor.id,
        toName: creditor.name,
        amount,
      });
      logs.push(`${debtor.name} → ${creditor.name}: ${amount}k`);

      debtor.score = Math.round((debtor.score + amount) * 100) / 100;
      creditor.score = Math.round((creditor.score - amount) * 100) / 100;
    }

    if (Math.abs(debtor.score) <= EPSILON) debtorIndex += 1;
    if (Math.abs(creditor.score) <= EPSILON) creditorIndex += 1;
  }

  return { transactions, logs, isBalanced: true, imbalance: 0 };
}

export function getVietQRUrl(
  bankId: string,
  accountNo: string,
  amount: number,
  description: string
): string {
  const cleanBankId = bankId.trim().replace(/[^A-Za-z0-9_-]/g, '');
  const cleanAccountNo = accountNo.trim().replace(/\s+/g, '');
  const amountVnd = Math.max(0, Math.round(amount * 1000));
  const content = encodeURIComponent(description.trim().slice(0, 80));

  if (!cleanBankId || !cleanAccountNo || amountVnd <= 0) return '';

  return `https://img.vietqr.io/image/${encodeURIComponent(cleanBankId)}-${encodeURIComponent(cleanAccountNo)}-compact.png?amount=${amountVnd}&addInfo=${content}`;
}

export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  const normalized = Math.abs(amount) < EPSILON ? 0 : amount;
  const formatted = normalized.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  return normalized > 0 ? `+${formatted}k` : `${formatted}k`;
}

export function getMoneyColorClass(amount: number): string {
  if (amount > EPSILON) return 'text-emerald-600';
  if (amount < -EPSILON) return 'text-rose-600';
  return 'text-gray-600';
}

export function getMoneyBgClass(amount: number): string {
  if (amount > EPSILON) return 'bg-emerald-50 border-emerald-200';
  if (amount < -EPSILON) return 'bg-rose-50 border-rose-200';
  return 'bg-white border-gray-200';
}

export function calculateXiDachScores(
  hostId: string,
  playerScores: Record<string, number>
): RoundScore[] {
  const entries = Object.entries(playerScores).filter(([playerId]) => playerId !== hostId);

  if (entries.length === 0) {
    throw new Error('Xì Dách cần ít nhất một người chơi ngoài nhà cái.');
  }

  entries.forEach(([, change]) => {
    if (!Number.isFinite(change) || !Number.isInteger(change)) throw new Error('Điểm Xì Dách phải là số nguyên theo đơn vị nghìn đồng.');
  });

  const hostChange = -entries.reduce((sum, [, change]) => sum + change, 0);

  return [
    {
      playerId: hostId,
      change: hostChange,
      note: 'Nhà cái',
    },
    ...entries.map(([playerId, change]) => ({
      playerId,
      change,
      note: change > 0 ? 'Thắng nhà cái' : change < 0 ? 'Thua nhà cái' : 'Hòa',
    })),
  ];
}
