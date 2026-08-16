import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronDown, ChevronUp, History } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoney, getMoneyColorClass } from '@/lib/gameLogic';

interface HistoryScreenProps {
  onBack: () => void;
}

export default function HistoryScreen({ onBack }: HistoryScreenProps) {
  const { transactions, players } = useStore();
  const [expandedRound, setExpandedRound] = useState<string | null>(null);

  const getPlayerName = (playerId: string) =>
    players.find((player) => player.uid === playerId)?.displayName ?? 'Người chơi cũ';

  return (
    <div className="season-page min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="grid h-10 w-10 place-items-center rounded-xl hover:bg-gray-100"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Đối soát</p>
            <h1 className="text-xl font-black text-gray-900">Lịch sử ván</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-5">
        {transactions.length === 0 ? (
          <div className="py-20 text-center">
            <History className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 font-bold text-gray-700">Chưa có ván nào</p>
            <p className="mt-1 text-sm text-gray-400">Kết quả mới sẽ được lưu theo thứ tự thời gian.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.map((transaction) => {
              const expanded = expandedRound === transaction.id;
              const totalChange = transaction.scores.reduce((sum, score) => sum + score.change, 0);
              const balanced = Math.abs(totalChange) <= 0.01;

              return (
                <Card key={transaction.id} className="overflow-hidden bg-white/95">
                  <CardContent className="p-0">
                    <button
                      type="button"
                      onClick={() => setExpandedRound(expanded ? null : transaction.id)}
                      className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-gray-50"
                    >
                      <div className="season-soft season-text grid h-10 w-10 place-items-center rounded-xl font-black">
                        {transaction.roundNumber}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900">Ván {transaction.roundNumber}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.timestamp).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </p>
                      </div>
                      <Badge variant="outline" className={balanced ? 'text-gray-500' : 'border-rose-200 text-rose-600'}>
                        {balanced ? `${transaction.scores.length} người` : 'Lệch điểm'}
                      </Badge>
                      {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                    </button>

                    {expanded && (
                      <div className="border-t bg-slate-50/70 px-3.5 pb-3.5 pt-3">
                        <div className="space-y-2">
                          {[...transaction.scores]
                            .sort((a, b) => b.change - a.change)
                            .map((score, index) => (
                              <div key={score.playerId} className="flex items-center gap-2 rounded-xl bg-white p-2.5">
                                <span className="w-5 text-xs font-bold text-gray-300">{index + 1}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-gray-800">{getPlayerName(score.playerId)}</p>
                                  {score.note && <p className="truncate text-[11px] text-gray-400">{score.note}</p>}
                                </div>
                                <span className={`font-black ${getMoneyColorClass(score.change)}`}>
                                  {formatMoney(score.change)}
                                </span>
                              </div>
                            ))}
                        </div>

                        <div className={`mt-3 rounded-xl px-3 py-2 text-center text-xs font-semibold ${balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          Tổng ván: {formatMoney(totalChange)} {balanced ? '· cân bằng' : '· cần kiểm tra'}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
