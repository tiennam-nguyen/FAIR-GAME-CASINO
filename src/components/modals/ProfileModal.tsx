import { useEffect, useState } from 'react';
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
import { Building2, CreditCard, Loader2, Save, User } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { BANKS } from '@/types';
import { getCurrentUser, updatePlayerProfile } from '@/lib/firebase';
import { toast } from 'sonner';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function ProfileModal({ isOpen, onClose, onSave }: ProfileModalProps) {
  const { userProfile, setUserProfile, currentRoom } = useStore();
  const [displayName, setDisplayName] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountName, setAccountName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(userProfile?.displayName ?? '');
    setSelectedBank(userProfile?.bankInfo?.bankId ?? '');
    setAccountNo(userProfile?.bankInfo?.accountNo ?? '');
    setAccountName(userProfile?.bankInfo?.accountName ?? '');
    setErrors({});
  }, [userProfile, isOpen]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (displayName.trim().length < 2) nextErrors.displayName = 'Tên hiển thị cần ít nhất 2 ký tự.';
    if (displayName.trim().length > 30) nextErrors.displayName = 'Tên hiển thị tối đa 30 ký tự.';
    if (!selectedBank) nextErrors.bank = 'Vui lòng chọn ngân hàng.';

    const compactAccountNo = accountNo.replace(/\s+/g, '');
    if (compactAccountNo.length < 4) nextErrors.accountNo = 'Số tài khoản có vẻ quá ngắn.';
    if (compactAccountNo.length > 30) nextErrors.accountNo = 'Số tài khoản tối đa 30 ký tự.';
    if (!accountName.trim()) nextErrors.accountName = 'Vui lòng nhập tên chủ tài khoản.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const user = getCurrentUser();
    const uid = user?.uid ?? userProfile?.uid;
    if (!uid) {
      setErrors({ form: 'Chưa có phiên đăng nhập. Hãy quay lại màn hình đầu và kết nối lại.' });
      return;
    }

    const bank = BANKS.find((item) => item.id === selectedBank);
    const profile = {
      uid,
      displayName: displayName.trim(),
      bankInfo: {
        bankId: selectedBank,
        bankName: bank?.shortName ?? bank?.name ?? selectedBank,
        accountNo: accountNo.replace(/\s+/g, '').trim(),
        accountName: accountName.trim().toUpperCase(),
      },
    };

    setIsSaving(true);
    try {
      if (currentRoom?.id) {
        await updatePlayerProfile(currentRoom.id, uid, profile.displayName, profile.bankInfo);
      }
      setUserProfile(profile);
      toast.success('Đã cập nhật hồ sơ');
      onSave?.();
      onClose();
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ trong phòng hiện tại.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedBankInfo = BANKS.find((item) => item.id === selectedBank);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="season-text text-center text-xl font-black">
            Hồ sơ của bạn
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-5">
          {errors.form && (
            <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{errors.form}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName" className="flex items-center gap-2">
              <User className="season-text h-4 w-4" />
              Tên hiển thị
            </Label>
            <Input
              id="displayName"
              autoComplete="nickname"
              maxLength={30}
              placeholder="Ví dụ: Tùng Núi"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className={errors.displayName ? 'border-rose-500' : ''}
            />
            {errors.displayName && <p className="text-xs text-rose-600">{errors.displayName}</p>}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="season-text h-4 w-4" />
              Ngân hàng nhận tiền
            </Label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger className={errors.bank ? 'border-rose-500' : ''}>
                <SelectValue placeholder="Chọn ngân hàng" />
              </SelectTrigger>
              <SelectContent>
                {BANKS.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bank && <p className="text-xs text-rose-600">{errors.bank}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNo" className="flex items-center gap-2">
              <CreditCard className="season-text h-4 w-4" />
              Số tài khoản
            </Label>
            <Input
              id="accountNo"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Nhập số tài khoản"
              value={accountNo}
              onChange={(event) => setAccountNo(event.target.value.replace(/\s/g, ''))}
              className={errors.accountNo ? 'border-rose-500' : ''}
            />
            {errors.accountNo && <p className="text-xs text-rose-600">{errors.accountNo}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName" className="flex items-center gap-2">
              <User className="season-text h-4 w-4" />
              Tên chủ tài khoản
            </Label>
            <Input
              id="accountName"
              autoComplete="name"
              placeholder="NGUYEN VAN A"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value.toUpperCase())}
              className={errors.accountName ? 'border-rose-500' : ''}
            />
            {errors.accountName && <p className="text-xs text-rose-600">{errors.accountName}</p>}
          </div>

          {selectedBank && accountNo && (
            <div className="season-soft season-border rounded-2xl border p-4">
              <p className="text-xs font-medium text-gray-500">Xem trước thông tin nhận tiền</p>
              <p className="season-text mt-1 font-bold">
                {selectedBankInfo?.shortName} · {accountNo}
              </p>
              <p className="mt-0.5 text-sm text-gray-700">{accountName || 'Tên chủ tài khoản'}</p>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            Thông tin ngân hàng được lưu trên thiết bị và gửi vào phòng bạn tham gia để người cùng phòng tạo VietQR khi chốt tiền.
          </div>

          <Button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="season-button h-12 w-full rounded-xl border-0 font-bold"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
