import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowRight,
  CircleDollarSign,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  getCurrentUser,
  getFirebaseConfigurationError,
  isFirebaseReady,
  onAuthChange,
  signInAnonymous,
} from '@/lib/firebase';
import SeasonSwitcher from '@/components/SeasonSwitcher';
import { getSeasonMeta, resolveSeason } from '@/lib/season';

interface WelcomeScreenProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export default function WelcomeScreen({ onCreateRoom, onJoinRoom }: WelcomeScreenProps) {
  const {
    userProfile,
    setUserProfile,
    setShowProfileModal,
    seasonPreference,
  } = useStore();

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentSeason = getSeasonMeta(resolveSeason(seasonPreference));

  const ensureProfileUid = useCallback((uid: string) => {
    const current = useStore.getState().userProfile;
    if (current?.uid === uid) return;
    setUserProfile({
      uid,
      displayName: current?.displayName ?? '',
      bankInfo: current?.bankInfo ?? {
        bankId: '',
        bankName: '',
        accountNo: '',
        accountName: '',
      },
    });
  }, [setUserProfile]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);

    const configError = getFirebaseConfigurationError();
    if (configError || !isFirebaseReady()) {
      setAuthError(configError ?? 'Firebase chưa sẵn sàng.');
      setIsAuthReady(false);
      setIsLoading(false);
      return;
    }

    try {
      const existingUser = getCurrentUser();
      const user = existingUser ?? (await signInAnonymous());
      ensureProfileUid(user.uid);
      setIsAuthReady(true);
    } catch (error) {
      setIsAuthReady(false);
      setAuthError(error instanceof Error ? error.message : 'Không thể kết nối đến Firebase.');
    } finally {
      setIsLoading(false);
    }
  }, [ensureProfileUid]);

  useEffect(() => {
    void connect();
    const unsubscribe = onAuthChange((user) => {
      if (!user) return;
      ensureProfileUid(user.uid);
      setIsAuthReady(true);
      setAuthError(null);
    });
    return unsubscribe;
  }, [connect, ensureProfileUid]);

  const requireProfileThen = (action: () => void) => {
    if (!isAuthReady) {
      setAuthError('Chưa kết nối được server. Hãy thử kết nối lại.');
      return;
    }

    const profile = useStore.getState().userProfile;
    if (
      !profile?.displayName.trim() ||
      !profile.bankInfo.bankId ||
      !profile.bankInfo.accountNo.trim() ||
      !profile.bankInfo.accountName.trim()
    ) {
      setShowProfileModal(true);
      return;
    }

    action();
  };

  return (
    <main className="season-gradient relative min-h-screen overflow-hidden px-4 py-8 sm:py-12">
      <div className="season-orb pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full" />
      <div className="season-orb pointer-events-none absolute -right-24 bottom-20 h-72 w-72 rounded-full opacity-60" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center gap-4">
        <div className="px-1 text-white">
          <div className="mb-5 flex items-center justify-between">
            <div className="season-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {currentSeason.label}
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-white/80">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isAuthReady ? (
                <Wifi className="h-4 w-4" />
              ) : (
                <WifiOff className="h-4 w-4" />
              )}
              {isLoading ? 'Đang kết nối' : isAuthReady ? 'Sẵn sàng' : 'Mất kết nối'}
            </div>
          </div>

          <h1 className="max-w-sm text-5xl font-black tracking-[-0.055em] sm:text-6xl">
            Sòng Phẳng
          </h1>
          <p className="mt-3 max-w-sm text-base leading-7 text-white/80">
            Ghi điểm, cấn nợ và chốt tiền cho hội bạn — nhanh, rõ và không cần sổ tay.
          </p>
        </div>

        <Card className="glass overflow-hidden rounded-[1.75rem] border-0 shadow-2xl shadow-black/15">
          <CardContent className="space-y-5 p-5 sm:p-6">
            {authError && (
              <Alert variant="destructive">
                <WifiOff className="h-4 w-4" />
                <AlertDescription className="flex flex-col gap-2">
                  <span>{authError}</span>
                  <button type="button" className="w-fit font-semibold underline" onClick={() => void connect()}>
                    Thử kết nối lại
                  </button>
                </AlertDescription>
              </Alert>
            )}

            {userProfile?.displayName ? (
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="season-soft season-border flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition hover:brightness-[0.99]"
              >
                <div className="season-solid grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-bold text-white">
                  {userProfile.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{userProfile.displayName}</p>
                  <p className="truncate text-xs text-gray-500">
                    {userProfile.bankInfo.bankName || 'Bổ sung thông tin nhận tiền'}
                  </p>
                </div>
                <span className="season-text text-xs font-semibold">Chỉnh sửa</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="season-soft season-border w-full rounded-2xl border p-4 text-left"
              >
                <p className="font-semibold text-gray-900">Thiết lập hồ sơ trước khi chơi</p>
                <p className="mt-1 text-sm text-gray-500">Tên hiển thị + tài khoản nhận tiền VietQR.</p>
              </button>
            )}

            <div className="grid gap-3">
              <Button
                onClick={() => requireProfileThen(onCreateRoom)}
                disabled={isLoading}
                className="season-button h-14 rounded-2xl border-0 text-base font-bold"
              >
                Tạo phòng mới
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={() => requireProfileThen(onJoinRoom)}
                disabled={isLoading}
                variant="outline"
                className="season-border h-14 rounded-2xl bg-white text-base font-bold"
              >
                Vào bằng mã phòng
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                [Users, 'Tối đa 4 người'],
                [CircleDollarSign, 'Cấn nợ gọn'],
                [ShieldCheck, 'Chốt sổ rõ ràng'],
              ].map(([Icon, label]) => (
                <div key={label as string} className="rounded-2xl bg-gray-50 px-2 py-3 text-center">
                  <Icon className="season-text mx-auto h-5 w-5" />
                  <p className="mt-1.5 text-[11px] font-medium leading-4 text-gray-500">{label as string}</p>
                </div>
              ))}
            </div>

            <SeasonSwitcher />

            <p className="text-center text-[11px] leading-4 text-gray-400">
              Công cụ ghi điểm cho nhóm bạn. Hãy tuân thủ quy định pháp luật nơi bạn sử dụng.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
