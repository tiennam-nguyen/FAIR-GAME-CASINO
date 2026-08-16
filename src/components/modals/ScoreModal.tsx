import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Calculator, Loader2, Trophy } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { addTransaction } from '@/lib/firebase';
import { calculateRoundScore, calculateXiDachScores, formatMoney } from '@/lib/gameLogic';
import type { PlayerResult, RoundScore } from '@/types';
import { toast } from 'sonner';

interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emptyRankings = { 1: '', 2: '', 3: '', 4: '' };

export default function ScoreModal({ isOpen, onClose }: ScoreModalProps) {
  const { currentRoom, players, userProfile } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [rankings, setRankings] = useState<Record<number, string>>({ ...emptyRankings });
  const [penalties, setPenalties] = useState<Record<string, { enabled: boolean; amount: number }>>({});
  const [xiDachScores, setXiDachScores] = useState<Record<string, number>>({});

  const gameType = currentRoom?.gameConfig.gameType ?? 'tien_len';
  const isHost = Boolean(currentRoom && userProfile?.uid === currentRoom.hostId);
  const hostPlayer = players.find((player) => player.uid === currentRoom?.hostId);
  const xiDachPlayers = players.filter((player) => player.uid !== currentRoom?.hostId);
  const xiDachHostPreview = useMemo(
    () => -xiDachPlayers.reduce((sum, player) => sum + (xiDachScores[player.uid] ?? 0), 0),
    [xiDachPlayers, xiDachScores]
  );

  useEffect(() => {
    if (isOpen) return;
    setRankings({ ...emptyRankings });
    setPenalties({});
    setXiDachScores({});
    setLocalError(null);
  }, [isOpen]);

  const validate = () => {
    if (!currentRoom || !userProfile) return false;
    if (!isHost) {
      setLocalError('Chỉ chủ phòng được nhập kết quả.');
      return false;
    }
    if (currentRoom.status !== 'active') {
      setLocalError('Phòng đang chốt sổ, không thể thêm ván.');
      return false;
    }

    if (gameType === 'tien_len') {
      if (players.length !== 4) {
        setLocalError('Tiến Lên cần đúng 4 người trong phòng.');
        return false;
      }
      const selected = Object.values(rankings).filter(Boolean);
      if (selected.length !== 4 || new Set(selected).size !== 4) {
        setLocalError('Hãy chọn đủ 4 người, mỗi người đúng một hạng.');
        return false;
      }
    } else if (gameType === 'xi_dach') {
      if (!hostPlayer || xiDachPlayers.length < 1) {
        setLocalError('Xì Dách cần nhà cái và ít nhất một người chơi.');
        return false;
      }
    } else {
      setLocalError('Trò chơi này chưa được hỗ trợ.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !currentRoom || !userProfile) return;

    setIsSubmitting(true);
    setLocalError(null);

    try {
      let scores: RoundScore[];

      if (gameType === 'tien_len') {
        const results: PlayerResult[] = players.map((player) => {
          const entry = Object.entries(rankings).find(([, playerId]) => playerId === player.uid);
          const rank = Number(entry?.[0]) as 1 | 2 | 3 | 4;
          const penalty = penalties[player.uid];
          return {
            playerId: player.uid,
            rank,
            penalties: penalty?.enabled && rank !== 1 ? penalty.amount : 0,
          };
        });
        scores = calculateRoundScore(currentRoom.gameConfig, results);
      } else {
        scores = calculateXiDachScores(currentRoom.hostId, xiDachScores);
      }

      await addTransaction(currentRoom.id, {
        timestamp: Date.now(),
        gameType,
        scores,
        createdBy: userProfile.uid,
      });

      toast.success('Đã lưu kết quả ván');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu điểm.';
      setLocalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availablePlayers = (currentRank: number) => {
    const selectedElsewhere = Object.entries(rankings)
      .filter(([rank]) => Number(rank) !== currentRank)
      .map(([, playerId]) => playerId);
    return players.filter((player) => !selectedElsewhere.includes(player.uid));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="season-text text-center text-xl font-black">
            Ghi kết quả ván
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-5">
          {localError && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{localError}</span>
            </div>
          )}

          {!isHost && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              Bạn có thể theo dõi điểm theo thời gian thực; chỉ chủ phòng mới chốt kết quả.
            </div>
          )}

          {gameType === 'tien_len' ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((rank) => (
                  <div key={rank} className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                      <Trophy className={`h-3.5 w-3.5 ${rank === 1 ? 'text-amber-500' : 'text-gray-400'}`} />
                      {rank === 1 ? 'Nhất' : rank === 2 ? 'Nhì' : rank === 3 ? 'Ba' : 'Bét'}
                    </Label>
                    <Select
                      value={rankings[rank]}
                      onValueChange={(value) => {
                        setRankings((current) => ({ ...current, [rank]: value }));
                        setLocalError(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn người" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlayers(rank).map((player) => (
                          <SelectItem key={player.uid} value={player.uid}>
                            {player.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-bold text-gray-800">Phạt thêm</p>
                <div className="space-y-2">
                  {players.map((player) => {
                    const isWinner = rankings[1] === player.uid;
                    const penalty = penalties[player.uid];
                    return (
                      <div key={player.uid} className="flex min-h-11 items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
                        <Checkbox
                          id={`penalty-${player.uid}`}
                          disabled={isWinner}
                          checked={!isWinner && Boolean(penalty?.enabled)}
                          onCheckedChange={(checked) =>
                            setPenalties((current) => ({
                              ...current,
                              [player.uid]: {
                                enabled: Boolean(checked),
                                amount: current[player.uid]?.amount ?? 10,
                              },
                            }))
                          }
                        />
                        <Label htmlFor={`penalty-${player.uid}`} className="min-w-0 flex-1 cursor-pointer truncate">
                          {player.displayName}
                          {isWinner && <span className="ml-1 text-xs font-normal text-gray-400">· Nhất</span>}
                        </Label>
                        {!isWinner && penalty?.enabled && (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              value={penalty.amount}
                              onChange={(event) =>
                                setPenalties((current) => ({
                                  ...current,
                                  [player.uid]: {
                                    enabled: true,
                                    amount: Math.max(0, Number(event.target.value)),
                                  },
                                }))
                              }
                              className="h-9 w-20 text-right"
                            />
                            <span className="text-xs text-gray-500">k</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : gameType === 'xi_dach' ? (
            <div className="space-y-4">
              <div className="season-soft season-border flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <p className="text-xs font-medium text-gray-500">Nhà cái</p>
                  <p className="font-bold text-gray-900">{hostPlayer?.displayName ?? 'Chủ phòng'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tự cân bằng</p>
                  <p className="season-text text-xl font-black">{formatMoney(xiDachHostPreview)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {xiDachPlayers.map((player) => (
                  <label key={player.uid} className="flex items-center gap-3 rounded-xl border p-3">
                    <span className="min-w-0 flex-1 truncate font-semibold">{player.displayName}</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={xiDachScores[player.uid] ?? ''}
                      onChange={(event) =>
                        setXiDachScores((current) => ({
                          ...current,
                          [player.uid]: event.target.value === '' ? 0 : Number(event.target.value),
                        }))
                      }
                      className="w-28 text-right"
                      placeholder="0"
                      step={1}
                    />
                    <span className="text-xs text-gray-500">k</span>
                  </label>
                ))}
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                <Calculator className="mt-0.5 h-4 w-4 shrink-0" />
                Nhập số dương nếu người chơi thắng nhà cái, số âm nếu thua. Điểm nhà cái được tính tự động để tổng luôn bằng 0.
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              Poker chưa có logic chấm điểm trong phiên bản này.
            </div>
          )}

          <Button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !isHost}
            className="season-button h-12 w-full rounded-xl border-0 font-bold"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Đang lưu...' : 'Lưu kết quả'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
