import React, { useEffect, useRef, useState } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { queryClient } from '../../lib/queryClient';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const wasOffline = useRef<boolean>(false);
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setShowRestored(false);
    } else if (wasOffline.current) {
      wasOffline.current = false;
      setShowRestored(true);

      // Revalidate active queries upon reconnection
      queryClient.refetchQueries({ type: 'active' });

      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (isOnline && !showRestored) {
    return null;
  }

  if (showRestored) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="relative z-20 w-full bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-800 dark:text-emerald-200 px-4 py-2 text-xs sm:text-sm font-medium transition-colors duration-150 motion-reduce:transition-none"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Connection restored. Updating...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-20 w-full bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs sm:text-sm font-medium transition-colors duration-150 motion-reduce:transition-none"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>You are currently offline. Changes cannot be saved until your connection is restored.</span>
      </div>
    </div>
  );
};
