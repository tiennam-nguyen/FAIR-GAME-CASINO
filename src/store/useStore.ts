import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Room, Player, Transaction, BankInfo } from '@/types';
import type { SeasonPreference } from '@/lib/season';

interface UserProfile {
  displayName: string;
  bankInfo: BankInfo;
  uid: string;
}

interface AppState {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;

  seasonPreference: SeasonPreference;
  setSeasonPreference: (preference: SeasonPreference) => void;

  currentRoom: Room | null;
  setCurrentRoom: (room: Room | null) => void;

  players: Player[];
  setPlayers: (players: Player[]) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;

  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  currentView: 'welcome' | 'dashboard' | 'settlement' | 'history';
  setCurrentView: (view: 'welcome' | 'dashboard' | 'settlement' | 'history') => void;

  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  showScoreModal: boolean;
  setShowScoreModal: (show: boolean) => void;
  showJoinModal: boolean;
  setShowJoinModal: (show: boolean) => void;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;

  resetRoomState: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      userProfile: null,
      setUserProfile: (profile) => set({ userProfile: profile }),
      updateUserProfile: (updates) =>
        set((state) => ({
          userProfile: state.userProfile ? { ...state.userProfile, ...updates } : null,
        })),

      seasonPreference: 'auto',
      setSeasonPreference: (seasonPreference) => set({ seasonPreference }),

      currentRoom: null,
      setCurrentRoom: (currentRoom) => set({ currentRoom }),

      players: [],
      setPlayers: (players) => set({ players }),
      updatePlayer: (playerId, updates) =>
        set((state) => ({
          players: state.players.map((player) =>
            player.uid === playerId ? { ...player, ...updates } : player
          ),
        })),

      transactions: [],
      setTransactions: (transactions) => set({ transactions }),
      addTransaction: (transaction) =>
        set((state) => ({ transactions: [transaction, ...state.transactions] })),

      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),
      error: null,
      setError: (error) => set({ error }),

      currentView: 'welcome',
      setCurrentView: (currentView) => set({ currentView }),

      showProfileModal: false,
      setShowProfileModal: (showProfileModal) => set({ showProfileModal }),
      showScoreModal: false,
      setShowScoreModal: (showScoreModal) => set({ showScoreModal }),
      showJoinModal: false,
      setShowJoinModal: (showJoinModal) => set({ showJoinModal }),
      showCreateModal: false,
      setShowCreateModal: (showCreateModal) => set({ showCreateModal }),

      resetRoomState: () =>
        set({
          currentRoom: null,
          players: [],
          transactions: [],
          currentView: 'welcome',
          showProfileModal: false,
          showScoreModal: false,
          showJoinModal: false,
          showCreateModal: false,
          error: null,
        }),
    }),
    {
      name: 'song-phang-storage',
      partialize: (state) => ({
        userProfile: state.userProfile,
        seasonPreference: state.seasonPreference,
      }),
    }
  )
);

export default useStore;
