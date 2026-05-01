import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const syncStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', syncStatus);
    window.addEventListener('offline', syncStatus);

    return () => {
      window.removeEventListener('online', syncStatus);
      window.removeEventListener('offline', syncStatus);
    };
  }, []);

  return isOnline;
}
