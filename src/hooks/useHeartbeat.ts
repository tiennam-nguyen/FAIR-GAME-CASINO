import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Heartbeat hook to track user presence
export function useHeartbeat(
  roomId: string | null,
  playerId: string | null,
  enabled: boolean = true
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !roomId || !playerId || !db) return;

    const sendHeartbeat = async () => {
      try {
        const playerRef = doc(db!, 'rooms', roomId, 'players', playerId);
        await updateDoc(playerRef, {
          lastActive: Date.now(), // Use client timestamp for simplicity
          isOnline: true,
        });
      } catch (error) {
        console.warn('Heartbeat failed:', error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 60 seconds
    intervalRef.current = setInterval(sendHeartbeat, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [roomId, playerId, enabled]);
}

// Check if player is online based on lastActive timestamp
export function isPlayerOnline(lastActive: number | undefined): boolean {
  if (!lastActive) return false;
  const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
  return lastActive > twoMinutesAgo;
}

export default useHeartbeat;
