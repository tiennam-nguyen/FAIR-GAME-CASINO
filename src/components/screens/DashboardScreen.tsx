import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  ChevronRight,
  Copy,
  Crown,
  History,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  Trash2,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  deleteTransaction,
  leaveRoom,
  subscribeToPlayers,
  subscribeToRoom,
  subscribeToTransactions,
  updateRoomStatus,
} from '@/lib/firebase';
import { useWakeLock } from '@/hooks/useWakeLock';
import { isPlayerOnline, useHeartbeat } from '@/hooks/useHeartbeat';
import { derivePlayerBalances, formatMoney, getMoneyBgClass, getMoneyColorClass } from '@/lib/gameLogic';
import { toast } from 'sonner';
import SeasonSwitcher from '@/components/SeasonSwitcher';

interface DashboardScreenProps {
  onLeaveRoom: () => void;
  onShowSettlement: () => void;
  onShowScoreModal: () => void;
  onShowHistory: () => void;
}

export default function DashboardScreen({
  onLeaveRoom,
  onShowSettlement,
  onShowScoreModal,
  onShowHistory,
}: DashboardScreenProps) {
  const {
    currentRoom,
    setCurrentRoom,
    players,
    setPlayers,
    transactions,
    setTransactions,
    userProfile,
    setShowProfileModal,
  } = useStore();

  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  useWakeLock(Boolean(currentRoom?.status === 'active'));
  useHeartbeat(currentRoom?.id ?? null, userProfile?.uid ?? null, Boolean(currentRoom?.status === 'active'));

  useEffect(() => {
    if (!currentRoom?.id) return;
    const roomId = currentRoom.id;
    const handleSubscriptionError = () => toast.error('Mất đồng bộ phòng. Kiểm tra kết nối mạng.');

    const unsubRoom = subscribeToRoom(
      roomId,
      (room) => {
        if (!room) {
          toast.error('Phòng không còn tồn tại.');
          onLeaveRoom();
          return;
        }
        setCurrentRoom(room);
        if (room.status === 'settling' || room.status === 'closed') {
          onShowSettlement();
        }
      },
      handleSubscriptionError
    );
    const unsubPlayers = subscribeToPlayers(roomId, setPlayers, handleSubscriptionError);
    const unsubTransactions = subscribeToTransactions(roomId, setTransactions, handleSubscriptionError);

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubTransactions();
    };
  }, [currentRoom?.id, onLeaveRoom, onShowSettlement, setCurrentRoom, setPlayers, setTransactions]);

  const isHost = currentRoom?.hostId === userProfile?.uid;
  const playersWithBalances = useMemo(
    () => derivePlayerBalances(players, transactions),
    [players, transactions]
  );
  const sortedPlayers = useMemo(
    () => [...playersWithBalances].sort((a, b) => b.currentScore - a.currentScore),
    [playersWithBalances]
  );

  const canScore =
    Boolean(isHost && currentRoom?.status === 'active') &&
    (currentRoom?.gameConfig.gameType === 'tien_len'
      ? players.length === 4
      : currentRoom?.gameConfig.gameType === 'xi_dach'
        ? players.length >= 2
        : false);

  const scoreHint =
    currentRoom?.gameConfig.gameType === 'tien_len'
      ? players.length === 4
        ? 'Sẵn sàng ghi ván mới'
        : `Cần đủ 4 người · hiện có ${players.length}`
      : players.length >= 2
        ? 'Sẵn sàng ghi ván mới'
        : 'Cần ít nhất 2 người';

  const copyRoomCode = async () => {
    if (!currentRoom?.id) return;
    try {
      await navigator.clipboard.writeText(currentRoom.id);
    } catch {
      const input = document.createElement('textarea');
      input.value = currentRoom.id;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleLeaveRoom = async () => {
    if (currentRoom?.id && userProfile?.uid) {
      try {
        await leaveRoom(currentRoom.id, userProfile.uid);
      } catch {
        toast.warning('Không cập nhật được trạng thái offline, nhưng bạn vẫn có thể rời màn hình.');
      }
    }
    onLeaveRoom();
  };

  const handleEndGame = async () => {
    if (!currentRoom?.id || !isHost) return;
    try {
      await updateRoomStatus(currentRoom.id, 'settling');
      onShowSettlement();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể chuyển sang chốt sổ.');
    }
  };

  const handleUndoLatest = async () => {
    const latest = transactions[0];
    if (!currentRoom?.id || !latest || !isHost || isUndoing) return;

    setIsUndoing(true);
    try {
      await deleteTransaction(currentRoom.id, latest.id);
      toast.success(`Đã hoàn tác ván ${latest.roundNumber}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể hoàn tác ván.');
    } finally {
      setIsUndoing(false);
    }
  };

  if (!currentRoom) return null;

  return (
    <div className="season-page min-h-screen pb-28">
      <header className="season-gradient safe-area-top sticky top-0 z-20 text-white shadow-lg shadow-black/10">
        <div className="mx-auto w-full max-w-md px-4 pb-4 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">Sòng Phẳng</h1>
                {isHost && <Crown className="h-4 w-4 text-amber-200" aria-label="Chủ phòng" />}
              </div>
              <button
                type="button"
                onClick={() => void copyRoomCode()}
                className="mt-1.5 inline-flex min-h-9 items-center gap-2 rounded-xl bg-white/12 px-3 text-sm font-bold transition hover:bg-white/20"
              >
                <span className="tracking-[0.14em]">{currentRoom.id}</span>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <SeasonSwitcher compact />
              <button
                type="button"
                onClick={() => setShowMenu(true)}
                className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"
                aria-label="Mở menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Badge className="border-white/15 bg-white/12 text-white hover:bg-white/12">
              {currentRoom.gameConfig.gameType === 'tien_len'
                ? 'Tiến Lên'
                : currentRoom.gameConfig.gameType === 'xi_dach'
                  ? 'Xì Dách'
                  : 'Poker'}
            </Badge>
            <span className="text-sm text-white/75">{transactions.length} ván</span>
            <span className="ml-auto text-xs font-medium text-white/70">{scoreHint}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md space-y-6 px-4 py-5">
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Bảng điểm</p>
              <h2 className="mt-0.5 text-xl font-black text-gray-900">{players.length}/4 người</h2>
            </div>
            {!isHost && <span className="text-xs text-gray-400">Chủ phòng chốt điểm</span>}
          </div>

          {sortedPlayers.length === 0 ? (
            <Card className="border-dashed bg-white/80">
              <CardContent className="py-10 text-center">
                <Users className="mx-auto h-9 w-9 text-gray-300" />
                <p className="mt-2 font-semibold text-gray-700">Chưa thấy người chơi</p>
                <p className="mt-1 text-sm text-gray-400">Thử kiểm tra lại kết nối Firestore.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {sortedPlayers.map((player, index) => {
                const online = isPlayerOnline(player.lastActive);
                return (
                  <Card key={player.uid} className={`overflow-hidden border ${getMoneyBgClass(player.currentScore)}`}>
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/80 text-sm font-black text-gray-500 shadow-sm">
                          {index + 1}
                        </div>
                        <div className="season-solid grid h-10 w-10 shrink-0 place-items-center rounded-2xl font-bold text-white">
                          {player.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-bold text-gray-900">{player.displayName}</p>
                            {player.uid === currentRoom.hostId && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                          </div>
                          <p className="flex items-center gap-1.5 truncate text-xs text-gray-500">
                            <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            {online ? 'Đang online' : 'Đang offline'} · {player.bankInfo.bankName}
                          </p>
                        </div>
                        <p className={`shrink-0 text-xl font-black tabular-nums ${getMoneyColorClass(player.currentScore)}`}>
                          {formatMoney(player.currentScore)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {players.length < 4 && (
            <div className="season-soft season-border mt-3 rounded-2xl border p-3 text-sm leading-5 text-gray-600">
              Chia sẻ mã <strong className="season-text tracking-wider">{currentRoom.id}</strong> để mời thêm người.
              Người rời màn hình vẫn được giữ điểm để chốt sổ không bị mất dữ liệu.
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Diễn biến</p>
              <h2 className="mt-0.5 text-lg font-black text-gray-900">Ván gần đây</h2>
            </div>
            <button
              type="button"
              onClick={onShowHistory}
              disabled={transactions.length === 0}
              className="season-text flex min-h-9 items-center gap-1 text-sm font-bold disabled:opacity-40"
            >
              Xem tất cả <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {transactions.length === 0 ? (
            <Card className="bg-white/90">
              <CardContent className="py-8 text-center">
                <History className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm font-semibold text-gray-600">Chưa có ván nào</p>
                <p className="mt-1 text-xs text-gray-400">Ván đầu tiên sẽ xuất hiện ở đây.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden bg-white/95">
              <CardContent className="p-0">
                {transactions.slice(0, 4).map((transaction, index) => (
                  <div
                    key={transaction.id}
                    className={`flex items-center gap-3 p-3.5 ${index < Math.min(transactions.length, 4) - 1 ? 'border-b' : ''}`}
                  >
                    <div className="season-soft season-text grid h-9 w-9 place-items-center rounded-xl text-sm font-black">
                      {transaction.roundNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-800">Ván {transaction.roundNumber}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(transaction.timestamp).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[...transaction.scores]
                        .filter((score) => Math.abs(score.change) > 0.01)
                        .sort((a, b) => b.change - a.change)
                        .slice(0, 2)
                        .map((score) => (
                          <span key={score.playerId} className={`text-xs font-bold ${getMoneyColorClass(score.change)}`}>
                            {formatMoney(score.change)}
                          </span>
                        ))}
                    </div>
                    {isHost && index === 0 && (
                      <button
                        type="button"
                        onClick={() => void handleUndoLatest()}
                        disabled={isUndoing}
                        className="grid h-9 w-9 place-items-center rounded-xl text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        aria-label={`Hoàn tác ván ${transaction.roundNumber}`}
                        title="Hoàn tác ván gần nhất"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      {isHost && (
        <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-20 border-t bg-white/90 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-md gap-2">
            <Button
              variant="outline"
              onClick={() => void handleEndGame()}
              className="season-border h-12 rounded-xl px-4 font-bold"
            >
              <ReceiptText className="mr-2 h-4 w-4" />
              Chốt sổ
            </Button>
            <Button
              onClick={onShowScoreModal}
              disabled={!canScore}
              className="season-button h-12 flex-1 rounded-xl border-0 font-bold"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ghi ván mới
            </Button>
          </div>
        </div>
      )}

      {showMenu && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Đóng menu"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setShowMenu(false)}
          />
          <aside className="absolute bottom-0 right-0 top-0 w-[min(22rem,88vw)] overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Phòng {currentRoom.id}</p>
                <h2 className="text-xl font-black text-gray-900">Tùy chọn</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="grid h-10 w-10 place-items-center rounded-xl hover:bg-gray-100"
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-4">
              <SeasonSwitcher />

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(true);
                    setShowMenu(false);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left font-semibold hover:bg-gray-50"
                >
                  <Users className="h-5 w-5 text-gray-400" />
                  Hồ sơ & nhận tiền
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onShowHistory();
                    setShowMenu(false);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left font-semibold hover:bg-gray-50"
                >
                  <History className="h-5 w-5 text-gray-400" />
                  Lịch sử ván
                </button>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleEndGame();
                      setShowMenu(false);
                    }}
                    className="season-text flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left font-semibold hover:bg-gray-50"
                  >
                    <ReceiptText className="h-5 w-5" />
                    Kết thúc & chốt sổ
                  </button>
                )}
              </div>

              <div className="border-t pt-3">
                <button
                  type="button"
                  onClick={() => void handleLeaveRoom()}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-5 w-5" />
                  Rời phòng
                </button>
                <p className="px-3 pt-1 text-xs leading-5 text-gray-400">
                  Rời màn hình không xóa điểm của bạn khỏi sổ.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {!isHost && (
        <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-10 border-t bg-white/90 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-md items-center gap-3">
            <WifiOff className="h-4 w-4 text-gray-400" />
            <p className="flex-1 text-xs leading-5 text-gray-500">Bạn đang theo dõi; chủ phòng là người ghi điểm và chốt sổ.</p>
            <Button variant="outline" size="sm" onClick={() => void handleLeaveRoom()} className="rounded-lg">
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Rời
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
