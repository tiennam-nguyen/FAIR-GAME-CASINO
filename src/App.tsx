import { useCallback, useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import useStore from '@/store/useStore';
import WelcomeScreen from '@/components/screens/WelcomeScreen';
import DashboardScreen from '@/components/screens/DashboardScreen';
import SettlementScreen from '@/components/screens/SettlementScreen';
import HistoryScreen from '@/components/screens/HistoryScreen';
import ProfileModal from '@/components/modals/ProfileModal';
import CreateRoomModal from '@/components/modals/CreateRoomModal';
import JoinRoomModal from '@/components/modals/JoinRoomModal';
import ScoreModal from '@/components/modals/ScoreModal';
import InAppBrowserOverlay from '@/components/InAppBrowserOverlay';
import { getPlayer, getRoom, onAuthChange } from '@/lib/firebase';
import { resolveSeason } from '@/lib/season';
import {
  readRoomLocation,
  writeRoomIdToLocation,
  type RoomLocation,
} from '@/lib/roomUrl';
import './App.css';

function App() {
  const {
    currentView,
    setCurrentView,

    currentRoom,
    activeRoomId,
    userProfile,
    setCurrentRoom,

    error,
    setError,

    showProfileModal,
    setShowProfileModal,

    showCreateModal,
    setShowCreateModal,

    showJoinModal,
    setShowJoinModal,

    showScoreModal,
    setShowScoreModal,

    resetRoomState,
    seasonPreference,
  } = useStore();

  const currentRoomId = currentRoom?.id ?? null;
  const profileUid = userProfile?.uid ?? null;

  const [isRestoringRoom, setIsRestoringRoom] = useState(
    Boolean(activeRoomId && !currentRoomId)
  );
  const [roomLocation, setRoomLocation] = useState<RoomLocation>(() =>
    typeof window === 'undefined' ? { kind: 'absent' } : readRoomLocation(window.location.search)
  );
  const [pendingJoinRoomId, setPendingJoinRoomId] = useState<string | null>(null);

  const requestedRoomId =
    roomLocation.kind === 'valid'
      ? roomLocation.roomId
      : roomLocation.kind === 'absent'
        ? activeRoomId
        : null;

  useEffect(() => {
    const handlePopState = () => {
      const nextLocation = readRoomLocation(window.location.search);
      setRoomLocation(nextLocation);
      if (nextLocation.kind === 'absent' && useStore.getState().currentRoom) {
        resetRoomState();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resetRoomState]);

  useEffect(() => {
    if (roomLocation.kind !== 'invalid') return;
    setCurrentView('welcome');
    setError('Mã phòng trên đường dẫn không hợp lệ.');
  }, [roomLocation, setCurrentView, setError]);

  useEffect(() => {
    document.documentElement.dataset.season = resolveSeason(seasonPreference);
  }, [seasonPreference]);

  useEffect(() => {
    if (!error) return;

    toast.error(error);
    setError(null);
  }, [error, setError]);

  useEffect(() => {
    // Không có phòng cần khôi phục.
    if (!requestedRoomId) {
      setIsRestoringRoom(false);
      return;
    }

    // Phòng đã có trong memory, ví dụ vừa Create/Join xong.
    if (currentRoomId === requestedRoomId) {
      setIsRestoringRoom(false);
      return;
    }

    let cancelled = false;
    setIsRestoringRoom(true);

    const unsubscribe = onAuthChange((user) => {
      if (cancelled) return;

      // Anonymous session đã mất thì không thể chứng minh đây là player cũ.
      if (!user) {
        resetRoomState();
        setError('Phiên đăng nhập trước đó không còn. Vui lòng vào lại phòng bằng mã phòng.');
        setIsRestoringRoom(false);
        return;
      }

      // Nếu profile đã lưu UID nhưng Firebase trả UID khác,
      // không được tự nhận lại membership của UID cũ.
      if (profileUid && user.uid !== profileUid) {
        resetRoomState();
        setError('Phiên người chơi đã thay đổi. Vui lòng vào lại phòng bằng mã phòng.');
        setIsRestoringRoom(false);
        return;
      }

      void (async () => {
        try {
          const [room, player] = await Promise.all([
            getRoom(requestedRoomId),
            getPlayer(requestedRoomId, user.uid),
          ]);

          if (cancelled) return;

          // Phòng đã mất hoặc UID hiện tại không còn membership.
          if (!room) {
            setCurrentView('welcome');
            setError('Không tìm thấy phòng trên đường dẫn.');
            return;
          }

          if (!player) {
            setCurrentView('welcome');
            setPendingJoinRoomId(room.id);
            const profile = useStore.getState().userProfile;
            const hasCompleteProfile = Boolean(
              profile?.displayName.trim() &&
              profile.bankInfo.bankId &&
              profile.bankInfo.accountNo.trim() &&
              profile.bankInfo.accountName.trim()
            );
            if (hasCompleteProfile) {
              setShowJoinModal(true);
            } else {
              setShowProfileModal(true);
            }
            return;
          }

          setCurrentRoom(room);

          if (room.status === 'settling' || room.status === 'closed') {
            setCurrentView('settlement');
          } else {
            setCurrentView('dashboard');
          }
        } catch (restoreError) {
          if (cancelled) return;

          console.error('Không thể khôi phục phòng sau reload.', restoreError);

          resetRoomState();
          setError(
            'Không thể khôi phục phòng trước đó. Vui lòng vào lại bằng mã phòng.'
          );
        } finally {
          if (!cancelled) {
            setIsRestoringRoom(false);
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [
    currentRoomId,
    profileUid,
    resetRoomState,
    requestedRoomId,
    setCurrentRoom,
    setCurrentView,
    setError,
    setShowJoinModal,
    setShowProfileModal,
  ]);

  const enterRoom = useCallback(
    async (roomId: string, action: 'created' | 'joined') => {
      const room = await getRoom(roomId);

      if (!room) {
        setError('Không đọc lại được phòng vừa thao tác. Vui lòng thử lại.');
        return;
      }

      setCurrentRoom(room);
      setCurrentView('dashboard');
      writeRoomIdToLocation(room.id);
      setRoomLocation({ kind: 'valid', roomId: room.id });
      setPendingJoinRoomId(null);

      toast.success(
        action === 'created'
          ? `Đã tạo phòng ${roomId}`
          : `Đã vào phòng ${roomId}`
      );
    },
    [setCurrentRoom, setCurrentView, setError]
  );

  const handleLeaveRoom = useCallback(() => {
    resetRoomState();
    writeRoomIdToLocation(null);
    setRoomLocation({ kind: 'absent' });
    setPendingJoinRoomId(null);
    toast.info('Đã rời phòng');
  }, [resetRoomState]);

  const handleShowSettlement = useCallback(
    () => setCurrentView('settlement'),
    [setCurrentView]
  );

  const handleShowHistory = useCallback(
    () => setCurrentView('history'),
    [setCurrentView]
  );

  const handleShowScore = useCallback(
    () => setShowScoreModal(true),
    [setShowScoreModal]
  );

  const handleBackToDashboard = useCallback(
    () => setCurrentView('dashboard'),
    [setCurrentView]
  );

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardScreen
            onLeaveRoom={handleLeaveRoom}
            onShowSettlement={handleShowSettlement}
            onShowScoreModal={handleShowScore}
            onShowHistory={handleShowHistory}
          />
        );

      case 'settlement':
        return (
          <SettlementScreen
            onBackToDashboard={handleBackToDashboard}
            onLeaveRoom={handleLeaveRoom}
          />
        );

      case 'history':
        return <HistoryScreen onBack={handleBackToDashboard} />;

      case 'welcome':
      default:
        return (
          <WelcomeScreen
            onCreateRoom={() => setShowCreateModal(true)}
            onJoinRoom={() => setShowJoinModal(true)}
          />
        );
    }
  };

  if (isRestoringRoom) {
    return (
      <div className="grid min-h-screen place-items-center">
        <InAppBrowserOverlay />

        <p className="text-sm font-semibold text-muted-foreground">
          Đang khôi phục phòng...
        </p>

        <Toaster position="top-center" richColors closeButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <InAppBrowserOverlay />

      {renderView()}

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSave={() => {
          if (pendingJoinRoomId) setShowJoinModal(true);
        }}
      />

      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoomCreated={(roomId) => enterRoom(roomId, 'created')}
      />

      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onRoomJoined={(roomId) => enterRoom(roomId, 'joined')}
        initialRoomCode={pendingJoinRoomId}
      />

      <ScoreModal
        isOpen={showScoreModal}
        onClose={() => setShowScoreModal(false)}
      />

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

export default App;
