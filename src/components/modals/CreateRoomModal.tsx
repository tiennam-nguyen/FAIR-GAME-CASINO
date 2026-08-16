import { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Coins, Gamepad2, Loader2, Settings } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { createRoom } from '@/lib/firebase';
import type { GameConfig, GameMode, GameType } from '@/types';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (roomId: string) => void;
}

export default function CreateRoomModal({ isOpen, onClose, onRoomCreated }: CreateRoomModalProps) {
  const { userProfile } = useStore();
  const [gameType, setGameType] = useState<GameType>('tien_len');
  const [gameMode, setGameMode] = useState<GameMode>('nhat_bet_nhi_ba');
  const [baseBet, setBaseBet] = useState(10);
  const [priceNhatBet, setPriceNhatBet] = useState(50);
  const [priceNhiBa, setPriceNhiBa] = useState(20);
  const [isCreating, setIsCreating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validMoney = (value: number) => Number.isFinite(value) && Number.isInteger(value) && value > 0 && value <= 1_000_000;

  const handleCreate = async () => {
    if (!userProfile?.uid) {
      setLocalError('Phiên đăng nhập chưa sẵn sàng.');
      return;
    }

    if (gameType === 'tien_len') {
      if (gameMode === 'nhat_an_tat' && !validMoney(baseBet)) {
        setLocalError('Mức cược phải lớn hơn 0.');
        return;
      }
      if (
        gameMode === 'nhat_bet_nhi_ba' &&
        (!validMoney(priceNhatBet) || !validMoney(priceNhiBa))
      ) {
        setLocalError('Các mức ăn phải lớn hơn 0.');
        return;
      }
    }

    setIsCreating(true);
    setLocalError(null);

    try {
      const gameConfig: GameConfig = {
        gameType,
        baseBet,
        rules: {
          mode: gameMode,
          price_nhat_bet: priceNhatBet,
          price_nhi_ba: priceNhiBa,
        },
      };

      const roomId = await createRoom(
        {
          uid: userProfile.uid,
          displayName: userProfile.displayName,
          bankInfo: userProfile.bankInfo,
        },
        gameConfig
      );

      onClose();
      await onRoomCreated(roomId);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Không thể tạo phòng.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="season-text text-center text-xl font-black">Tạo phòng mới</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-5">
          {localError && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{localError}</div>}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Gamepad2 className="season-text h-4 w-4" />
              Trò chơi
            </Label>
            <Select value={gameType} onValueChange={(value) => setGameType(value as GameType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tien_len">Tiến Lên Miền Nam</SelectItem>
                <SelectItem value="xi_dach">Xì Dách</SelectItem>
                <SelectItem value="poker" disabled>
                  Poker · chưa hỗ trợ
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {gameType === 'tien_len' ? (
            <>
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Settings className="season-text h-4 w-4" />
                  Cách tính tiền
                </Label>
                <RadioGroup
                  value={gameMode}
                  onValueChange={(value) => setGameMode(value as GameMode)}
                  className="space-y-2"
                >
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 hover:bg-gray-50">
                    <RadioGroupItem value="nhat_bet_nhi_ba" id="nhat_bet_nhi_ba" className="mt-0.5" />
                    <span>
                      <span className="font-semibold">Nhất ăn Bét · Nhì ăn Ba</span>
                      <span className="mt-0.5 block text-xs text-gray-500">Hai cặp thanh toán độc lập.</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 hover:bg-gray-50">
                    <RadioGroupItem value="nhat_an_tat" id="nhat_an_tat" className="mt-0.5" />
                    <span>
                      <span className="font-semibold">Nhất ăn tất</span>
                      <span className="mt-0.5 block text-xs text-gray-500">Mỗi người còn lại trả mức cược cho Nhất.</span>
                    </span>
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Coins className="season-text h-4 w-4" />
                  Mức tiền · nghìn đồng
                </Label>

                {gameMode === 'nhat_bet_nhi_ba' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="priceNhatBet" className="text-xs text-gray-500">Nhất ↔ Bét</Label>
                      <Input
                        id="priceNhatBet"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={priceNhatBet}
                        onChange={(event) => setPriceNhatBet(Number(event.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="priceNhiBa" className="text-xs text-gray-500">Nhì ↔ Ba</Label>
                      <Input
                        id="priceNhiBa"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={priceNhiBa}
                        onChange={(event) => setPriceNhiBa(Number(event.target.value))}
                      />
                    </div>
                  </div>
                ) : (
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={baseBet}
                    onChange={(event) => setBaseBet(Number(event.target.value))}
                  />
                )}
              </div>

              <div className="season-soft season-border rounded-xl border p-3 text-xs leading-5 text-gray-600">
                Tiến Lên trong phiên bản này chốt ván khi phòng có đúng 4 người. Chủ phòng là người nhập kết quả.
              </div>
            </>
          ) : (
            <div className="season-soft season-border rounded-xl border p-3 text-sm leading-6 text-gray-600">
              Chủ phòng là <strong>nhà cái</strong>. Khi nhập điểm, chỉ cần nhập phần thắng/thua của các người chơi còn lại; phần của nhà cái được cân bằng tự động.
            </div>
          )}

          <Button
            onClick={() => void handleCreate()}
            disabled={isCreating}
            className="season-button h-12 w-full rounded-xl border-0 font-bold"
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCreating ? 'Đang tạo...' : 'Tạo phòng'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
