import { useEffect, useRef } from 'react';

interface WakeLockSentinel {
  release: () => Promise<void>;
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
};

// Screen Wake Lock hook to keep screen awake during gameplay
export function useWakeLock(enabled: boolean = true) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const requestWakeLock = async () => {
      try {
        const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
        if (wakeLock) {
          wakeLockRef.current = await wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake lock request failed:', err);
      }
    };

    requestWakeLock();

    // Re-acquire wake lock when visibility changes (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.error);
      }
    };
  }, [enabled]);
}

export default useWakeLock;
