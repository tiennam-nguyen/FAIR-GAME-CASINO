import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getRoom, joinRoom } from '@/lib/firebase';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomJoined: (roomId: string) => void;
  initialRoomCode?: string | null;
}

export default function JoinRoomModal({
  isOpen,
  onClose,
  onRoomJoined,
  initialRoomCode = null,
}: JoinRoomModalProps) {
  const { userProfile } = useStore();
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRoomCode(initialRoomCode ?? '');
      setLocalError(null);
    } else {
      setRoomCode('');
      setLocalError(null);
    }
  }, [initialRoomCode, isOpen]);

  const handleJoin = async () => {
    if (roomCode.length !== 5) {
      setLocalError('Mã phòng gồm 5 ký tự.');
      return;
    }
    if (!userProfile?.uid) {
      setLocalError('Phiên đăng nhập chưa sẵn sàng.');
      return;
    }

    setIsJoining(true);
    setLocalError(null);

    try {
      const normalized = roomCode.toUpperCase();
      const room = await getRoom(normalized);

      if (!room) throw new Error('Không tìm thấy phòng này.');
      if (room.status === 'settling') throw new Error('Phòng đang chốt sổ nên tạm ngừng nhận người.');
      if (room.status === 'closed') throw new Error('Phòng đã đóng.');

      await joinRoom(normalized, {
        uid: userProfile.uid,
        displayName: userProfile.displayName,
        bankInfo: userProfile.bankInfo,
      });

      onClose();
      await onRoomJoined(normalized);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Không thể vào phòng.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleRoomCodeChange = (value: string) => {
    setRoomCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5));
    setLocalError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="season-text text-center text-xl font-black">Vào phòng</DialogTitle>
        </DialogHeader>

        <form
          className="mt-2 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleJoin();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="roomCode" className="flex items-center gap-2">
              <LogIn className="season-text h-4 w-4" />
              Mã phòng
            </Label>
            <Input
              id="roomCode"
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="AE888"
              value={roomCode}
              onChange={(event) => handleRoomCodeChange(event.target.value)}
              className={`h-16 text-center text-2xl font-black uppercase tracking-[0.28em] ${
                localError ? 'border-rose-500' : ''
              }`}
              maxLength={5}
            />
            <p className="text-center text-xs text-gray-500">Không dùng I, O, 0 và 1 để tránh nhìn nhầm.</p>
          </div>

          {localError && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{localError}</span>
            </div>
          )}

          {userProfile && (
            <div className="season-soft season-border flex items-center gap-3 rounded-2xl border p-3.5">
              <div className="season-solid grid h-10 w-10 place-items-center rounded-xl font-bold text-white">
                {userProfile.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{userProfile.displayName}</p>
                <p className="truncate text-xs text-gray-500">{userProfile.bankInfo.bankName}</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isJoining || roomCode.length !== 5}
            className="season-button h-12 w-full rounded-xl border-0 font-bold"
          >
            {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            {isJoining ? 'Đang vào...' : 'Vào phòng'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
