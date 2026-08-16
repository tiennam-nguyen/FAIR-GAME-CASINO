import { useCallback, useEffect } from 'react';
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
import { getRoom } from '@/lib/firebase';
import { resolveSeason } from '@/lib/season';
import './App.css';

function App() {
  const {
    currentView,
    setCurrentView,
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

  useEffect(() => {
    document.documentElement.dataset.season = resolveSeason(seasonPreference);
  }, [seasonPreference]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    setError(null);
  }, [error, setError]);

  const enterRoom = useCallback(async (roomId: string, action: 'created' | 'joined') => {
    const room = await getRoom(roomId);
    if (!room) {
      setError('Không đọc lại được phòng vừa thao tác. Vui lòng thử lại.');
      return;
    }
    setCurrentRoom(room);
    setCurrentView('dashboard');
    toast.success(action === 'created' ? `Đã tạo phòng ${roomId}` : `Đã vào phòng ${roomId}`);
  }, [setCurrentRoom, setCurrentView, setError]);

  const handleLeaveRoom = useCallback(() => {
    resetRoomState();
    toast.info('Đã rời phòng');
  }, [resetRoomState]);

  const handleShowSettlement = useCallback(() => setCurrentView('settlement'), [setCurrentView]);
  const handleShowHistory = useCallback(() => setCurrentView('history'), [setCurrentView]);
  const handleShowScore = useCallback(() => setShowScoreModal(true), [setShowScoreModal]);
  const handleBackToDashboard = useCallback(() => setCurrentView('dashboard'), [setCurrentView]);

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

  return (
    <div className="min-h-screen">
      <InAppBrowserOverlay />
      {renderView()}

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
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
