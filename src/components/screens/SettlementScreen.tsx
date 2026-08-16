import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Home,
  LogOut,
  Trophy,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  derivePlayerBalances,
  formatMoney,
  getMoneyColorClass,
  getVietQRUrl,
  simplifyDebts,
} from '@/lib/gameLogic';
import { closeRoom, subscribeToRoom, updateRoomStatus } from '@/lib/firebase';
import { toast } from 'sonner';

interface SettlementScreenProps {
  onBackToDashboard: () => void;
  onLeaveRoom: () => void;
}

export default function SettlementScreen({ onBackToDashboard, onLeaveRoom }: SettlementScreenProps) {
  const { currentRoom, setCurrentRoom, players, transactions, userProfile } = useStore();
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!currentRoom?.id) return;
    return subscribeToRoom(currentRoom.id, (room) => {
      if (room) setCurrentRoom(room);
    });
  }, [currentRoom?.id, setCurrentRoom]);

  const playersWithBalances = useMemo(
    () => derivePlayerBalances(players, transactions),
    [players, transactions]
  );
  const settlement = useMemo(
    () =>
      simplifyDebts(
        playersWithBalances.map((player) => ({
          id: player.uid,
          name: player.displayName,
          score: player.currentScore,
        }))
      ),
    [playersWithBalances]
  );

  const sortedPlayers = useMemo(
    () => [...playersWithBalances].sort((a, b) => b.currentScore - a.currentScore),
    [playersWithBalances]
  );
  const winner = sortedPlayers[0];
  const totalAmount = sortedPlayers.reduce((sum, player) => sum + Math.max(0, player.currentScore), 0);
  const isHost = currentRoom?.hostId === userProfile?.uid;
  const isClosed = currentRoom?.status === 'closed';

  const reopenRoom = async () => {
    if (!currentRoom?.id || !isHost || isClosed) return;
    try {
      await updateRoomStatus(currentRoom.id, 'active');
      onBackToDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể mở lại phòng.');
    }
  };

  const finalizeRoom = async () => {
    if (!currentRoom?.id || !isHost) return;
    setIsClosing(true);
    try {
      await closeRoom(currentRoom.id);
      setShowCloseConfirm(false);
      toast.success('Đã đóng sổ. Dữ liệu vẫn được giữ trên Firestore.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể đóng sổ.');
    } finally {
      setIsClosing(false);
    }
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã sao chép ${label}`);
    } catch {
      toast.error('Trình duyệt không cho phép sao chép tự động.');
    }
  };

  if (!currentRoom) return null;

  return (
    <div className="season-page min-h-screen pb-24">
      <header className="season-gradient text-white shadow-lg shadow-black/10">
        <div className="mx-auto w-full max-w-md px-4 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                Phòng {currentRoom.id}
              </p>
              <h1 className="mt-1 text-2xl font-black">{isClosed ? 'Sổ đã đóng' : 'Chốt sổ'}</h1>
            </div>
            <div className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold">
              {transactions.length} ván
            </div>
          </div>

          {winner && settlement.isBalanced && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/12 p-3.5">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
                <Trophy className="h-5 w-5 text-amber-200" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white/65">Dẫn đầu</p>
                <p className="truncate font-bold">{winner.displayName}</p>
              </div>
              <p className="text-xl font-black">{formatMoney(winner.currentScore)}</p>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-5">
        {!settlement.isBalanced && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Chưa thể thanh toán</p>
              <p className="mt-1 text-sm leading-6">
                Tổng điểm đang lệch {formatMoney(settlement.imbalance)}. Hãy quay lại và sửa ván sai; app không tự bù một sai lệch tiền.
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-slate-100">
            <TabsTrigger value="payments" className="rounded-lg">Thanh toán</TabsTrigger>
            <TabsTrigger value="ranking" className="rounded-lg">Bảng điểm</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="mt-4 space-y-3">
            {settlement.isBalanced && settlement.transactions.length === 0 ? (
              <Card className="bg-white/95">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                  <p className="mt-3 text-lg font-black text-gray-900">Không còn khoản cần chuyển</p>
                  <p className="mt-1 text-sm text-gray-500">Mọi người đang cân bằng ở 0k.</p>
                </CardContent>
              </Card>
            ) : (
              settlement.transactions.map((transaction, index) => {
                const receiver = players.find((player) => player.uid === transaction.toUser);
                const key = `${transaction.fromUser}-${transaction.toUser}-${transaction.amount}-${index}`;
                const expanded = expandedTransaction === key;
                const qrUrl = receiver
                  ? getVietQRUrl(
                      receiver.bankInfo.bankId,
                      receiver.bankInfo.accountNo,
                      transaction.amount,
                      `SONG PHANG ${currentRoom.id}`
                    )
                  : '';
                const isMine = transaction.fromUser === userProfile?.uid;

                return (
                  <Card
                    key={key}
                    className={`overflow-hidden bg-white/95 ${isMine ? 'season-border ring-1 ring-[var(--season-border)]' : ''}`}
                  >
                    <CardContent className="p-0">
                      <button
                        type="button"
                        onClick={() => setExpandedTransaction(expanded ? null : key)}
                        className="flex w-full items-center gap-3 p-4 text-left"
                      >
                        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isMine ? 'season-soft season-text' : 'bg-slate-100 text-slate-500'}`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-bold text-gray-900">{transaction.fromName}</span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
                            <span className="truncate font-bold text-gray-900">{transaction.toName}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">{isMine ? 'Khoản bạn cần chuyển' : 'Nhấn để xem VietQR'}</p>
                        </div>
                        <div className="text-right">
                          <p className="season-text text-lg font-black">{formatMoney(transaction.amount).replace('+', '')}</p>
                          {expanded ? <ChevronUp className="ml-auto h-4 w-4 text-gray-400" /> : <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />}
                        </div>
                      </button>

                      {expanded && (
                        <div className="border-t bg-slate-50/80 p-4">
                          {receiver && qrUrl ? (
                            <div className="space-y-4">
                              <div className="mx-auto w-fit rounded-2xl border bg-white p-3 shadow-sm">
                                <img
                                  src={qrUrl}
                                  alt={`VietQR chuyển ${transaction.amount} nghìn đồng cho ${receiver.displayName}`}
                                  className="h-52 w-52 object-contain"
                                  loading="lazy"
                                />
                              </div>

                              <div className="rounded-2xl bg-white p-3.5 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-xs text-gray-400">Tài khoản nhận</p>
                                    <p className="truncate font-bold text-gray-900">
                                      {receiver.bankInfo.bankName} · {receiver.bankInfo.accountNo}
                                    </p>
                                    <p className="truncate text-xs text-gray-500">{receiver.bankInfo.accountName}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => void copyText(receiver.bankInfo.accountNo, 'số tài khoản')}
                                    className="season-text grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50"
                                    aria-label="Sao chép số tài khoản"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-center text-[11px] leading-4 text-gray-400">
                                VietQR chỉ điền sẵn thông tin chuyển khoản; app không xác nhận giao dịch ngân hàng đã thành công.
                              </p>
                            </div>
                          ) : (
                            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                              Thiếu thông tin ngân hàng của người nhận nên chưa tạo được QR.
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}

            {settlement.isBalanced && settlement.transactions.length > 0 && (
              <div className="rounded-2xl bg-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-600">Tổng dòng tiền cần chuyển</span>
                  <span className="font-black text-gray-900">{formatMoney(totalAmount).replace('+', '')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogs((value) => !value)}
                  className="mt-3 text-xs font-semibold text-gray-400 underline underline-offset-4"
                >
                  {showLogs ? 'Ẩn cách cấn nợ' : 'Xem cách cấn nợ'}
                </button>
                {showLogs && (
                  <div className="mt-3 space-y-1 border-t pt-3 text-xs leading-5 text-gray-500">
                    {settlement.logs.map((log) => <p key={log}>{log}</p>)}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ranking" className="mt-4 space-y-2.5">
            {sortedPlayers.map((player, index) => (
              <Card key={player.uid} className="bg-white/95">
                <CardContent className="flex items-center gap-3 p-3.5">
                  <div className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-black ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {index + 1}
                  </div>
                  <div className="season-solid grid h-10 w-10 place-items-center rounded-2xl font-bold text-white">
                    {player.displayName.charAt(0).toUpperCase()}
                  </div>
                  <p className="min-w-0 flex-1 truncate font-bold text-gray-900">{player.displayName}</p>
                  <p className={`text-xl font-black ${getMoneyColorClass(player.currentScore)}`}>
                    {formatMoney(player.currentScore)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>

      <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-20 border-t bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-md gap-2">
          {isHost && !isClosed ? (
            <>
              <Button
                variant="outline"
                onClick={() => void reopenRoom()}
                className="season-border h-12 flex-1 rounded-xl font-bold"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Chơi tiếp
              </Button>
              <Button
                onClick={() => setShowCloseConfirm(true)}
                className="season-button h-12 flex-1 rounded-xl border-0 font-bold"
              >
                <Home className="mr-2 h-4 w-4" />
                Đóng sổ
              </Button>
            </>
          ) : (
            <Button
              onClick={onLeaveRoom}
              className="season-button h-12 w-full rounded-xl border-0 font-bold"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Rời phòng
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đóng sổ phòng {currentRoom.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Phòng sẽ chuyển sang trạng thái đã đóng và không nhận thêm ván mới. Lịch sử, điểm và thông tin thanh toán vẫn được giữ để có thể đối soát.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Chưa đóng</AlertDialogCancel>
            <AlertDialogAction onClick={() => void finalizeRoom()} disabled={isClosing}>
              {isClosing ? 'Đang đóng...' : 'Đóng sổ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
